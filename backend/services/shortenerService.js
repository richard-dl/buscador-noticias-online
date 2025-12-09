const axios = require('axios');

// Cache para URLs acortadas
const urlCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas
const SHORTENER_TIMEOUT = 5000; // 5 segundos timeout

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

    // No aceptar URLs de Google News (redirecciones)
    if (urlObj.hostname.includes('news.google.com')) {
      return { valid: false, reason: 'URL de Google News' };
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
 * Acortar URL con fallback entre servicios
 */
const shortenUrl = async (url, options = {}) => {
  // v.gd es más confiable actualmente
  const { validate = false, preferredService = 'vgd' } = options;

  // NO acortar URLs de Google News - son redirecciones que no funcionan bien acortadas
  if (url && url.includes('news.google.com')) {
    console.warn('Saltando acortamiento de URL de Google News:', url.substring(0, 60) + '...');
    return url;
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

  const services = {
    tinyurl: shortenWithTinyUrl,
    isgd: shortenWithIsGd,
    vgd: shortenWithVgd
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
