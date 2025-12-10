const axios = require('axios');
const { extractRealUrl } = require('./googleNewsService');

// Cache para URLs acortadas
const urlCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas
const SHORTENER_TIMEOUT = 3000; // 3 segundos timeout (reducido para mejor performance)

/**
 * Acortar URL usando v.gd (más confiable actualmente)
 */
const shortenWithVgd = async (url) => {
  try {
    const response = await axios.get('https://v.gd/create.php', {
      params: {
        format: 'simple',
        url: url
      },
      timeout: SHORTENER_TIMEOUT
    });

    return response.data;
  } catch (error) {
    // Solo loguear si no es timeout o error común
    if (!error.message.includes('timeout') && !error.message.includes('503')) {
      console.warn('Error con v.gd:', error.message);
    }
    return null;
  }
};

/**
 * Acortar URL usando is.gd (alternativa gratuita)
 */
const shortenWithIsGd = async (url) => {
  try {
    const response = await axios.get('https://is.gd/create.php', {
      params: {
        format: 'simple',
        url: url
      },
      timeout: SHORTENER_TIMEOUT
    });

    return response.data;
  } catch (error) {
    if (!error.message.includes('timeout') && !error.message.includes('503')) {
      console.warn('Error con is.gd:', error.message);
    }
    return null;
  }
};

/**
 * Acortar URL usando TinyURL (servicio gratuito, sin API key)
 */
const shortenWithTinyUrl = async (url) => {
  try {
    const response = await axios.get('https://tinyurl.com/api-create.php', {
      params: { url },
      timeout: SHORTENER_TIMEOUT
    });

    return response.data;
  } catch (error) {
    if (!error.message.includes('timeout') && !error.message.includes('400')) {
      console.warn('Error con TinyURL:', error.message);
    }
    return null;
  }
};

/**
 * Verificar que una URL es válida y accesible
 */
const validateUrl = async (url) => {
  try {
    // Verificar formato básico
    const urlObj = new URL(url);

    // URLs de Google News son válidas (se acortan directamente)
    if (urlObj.hostname.includes('news.google.com')) {
      return { valid: true, finalUrl: url };
    }

    // Verificar que la URL responde
    const response = await axios.head(url, {
      timeout: 5000,
      maxRedirects: 3,
      validateStatus: status => status < 400
    });

    return {
      valid: true,
      finalUrl: response.request.res?.responseUrl || url
    };
  } catch (error) {
    return {
      valid: false,
      reason: error.message
    };
  }
};

/**
 * Resolver URL de Google News a la URL final del artículo
 * Usa la función extractRealUrl de googleNewsService que decodifica base64
 * Si no se puede resolver, devuelve la URL de Google News para acortarla directamente
 */
const resolveGoogleNewsUrl = async (url) => {
  try {
    // Usar la función especializada de googleNewsService
    // que maneja la decodificación base64 de las URLs de Google News
    const realUrl = await extractRealUrl(url);

    // Si se obtuvo una URL diferente y no es de Google News, devolverla
    if (realUrl && realUrl !== url && !realUrl.includes('news.google.com')) {
      console.log('Google News URL decodificada:', realUrl.substring(0, 60) + '...');
      return realUrl;
    }

    // Si no se pudo decodificar, devolver la URL de Google News
    // Los acortadores pueden acortar cualquier URL válida
    // y cuando el usuario haga clic, Google News lo redirigirá
    console.log('Google News URL no decodificable, se acortará directamente');
    return url;
  } catch (error) {
    console.warn('Error resolviendo Google News URL:', error.message);
    return url;
  }
};

/**
 * Acortar URL con fallback entre servicios
 */
const shortenUrl = async (url, options = {}) => {
  // is.gd redirige directamente (301), v.gd muestra página intermedia
  const { validate = false, preferredService = 'isgd' } = options;

  // Para URLs de Google News, intentar resolver a la URL final del artículo
  // Si no se puede resolver, acortar la URL de Google News directamente
  if (url && url.includes('news.google.com')) {
    try {
      const resolvedUrl = await resolveGoogleNewsUrl(url);
      if (resolvedUrl && resolvedUrl !== url && !resolvedUrl.includes('news.google.com')) {
        url = resolvedUrl;
        console.log('Google News URL resuelta:', url.substring(0, 60) + '...');
      } else {
        // No se pudo resolver, pero igual acortamos la URL de Google News
        // El usuario será redirigido al artículo cuando haga clic
        console.log('Acortando URL de Google News directamente');
      }
    } catch (err) {
      console.warn('Error resolviendo Google News URL:', err.message);
      // Continuar con la URL original de Google News
    }
  }

  // Verificar cache
  const cacheKey = url;
  if (urlCache.has(cacheKey)) {
    const cached = urlCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.shortUrl;
    }
  }

  // Validar URL si se requiere
  if (validate) {
    const validation = await validateUrl(url);
    if (!validation.valid) {
      console.warn(`URL inválida: ${url} - ${validation.reason}`);
      return url; // Devolver URL original si no es válida
    }
    url = validation.finalUrl; // Usar URL final después de redirecciones
  }

  // Intentar acortar con los servicios disponibles
  let shortUrl = null;

  // Orden de preferencia: is.gd (redirect 301 directo), v.gd (fallback), tinyurl (último)
  const services = {
    isgd: shortenWithIsGd,
    vgd: shortenWithVgd,
    tinyurl: shortenWithTinyUrl
  };

  // Ordenar servicios poniendo el preferido primero
  const orderedServices = [preferredService, ...Object.keys(services).filter(s => s !== preferredService)];

  for (const serviceName of orderedServices) {
    const service = services[serviceName];
    if (service) {
      shortUrl = await service(url);
      if (shortUrl && shortUrl.startsWith('http')) {
        break;
      }
    }
  }

  // Si ningún servicio funciona, devolver URL original
  if (!shortUrl) {
    console.warn('No se pudo acortar la URL, devolviendo original');
    return url;
  }

  // Guardar en cache
  urlCache.set(cacheKey, {
    shortUrl,
    timestamp: Date.now()
  });

  return shortUrl;
};

/**
 * Acortar múltiples URLs en paralelo
 */
const shortenBatch = async (urls, options = {}) => {
  const { concurrency = 5 } = options;

  const results = [];

  // Procesar en lotes para no saturar los servicios
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => shortenUrl(url, options))
    );
    results.push(...batchResults);

    // Pequeña pausa entre lotes
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
};

/**
 * Limpiar URL de parámetros de tracking
 */
const cleanTrackingParams = (url) => {
  try {
    const urlObj = new URL(url);

    // Parámetros comunes de tracking a eliminar
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'fbclid', 'gclid', 'ref', 'source', 'mc_eid', 'mc_cid'
    ];

    for (const param of trackingParams) {
      urlObj.searchParams.delete(param);
    }

    return urlObj.toString();
  } catch (error) {
    return url;
  }
};

/**
 * Obtener estadísticas del cache
 */
const getCacheStats = () => {
  return {
    size: urlCache.size
  };
};

/**
 * Limpiar cache
 */
const clearCache = () => {
  urlCache.clear();
};

module.exports = {
  shortenUrl,
  shortenBatch,
  validateUrl,
  cleanTrackingParams,
  getCacheStats,
  clearCache
};
