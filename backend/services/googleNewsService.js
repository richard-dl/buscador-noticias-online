const axios = require('axios');
const cheerio = require('cheerio');

// Provincias argentinas para búsquedas geográficas
const PROVINCIAS_ARGENTINA = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán'
];

// Temáticas predefinidas
const TEMATICAS = {
  politica: ['política', 'gobierno', 'congreso', 'diputados', 'senadores', 'presidente', 'ministerio', 'ley', 'elecciones', 'partido'],
  economia: ['economía', 'dólar', 'inflación', 'banco central', 'mercados', 'peso', 'inversión', 'bolsa', 'finanzas', 'comercio'],
  deportes: ['fútbol', 'deportes', 'selección argentina', 'liga profesional', 'mundial', 'copa', 'jugador', 'equipo', 'torneo', 'gol'],
  espectaculos: ['espectáculos', 'famosos', 'televisión', 'cine', 'actor', 'actriz', 'película', 'serie', 'streaming', 'festival'],
  tecnologia: ['tecnología', 'inteligencia artificial', 'apps', 'internet', 'celular', 'software', 'digital', 'innovación', 'startup', 'ciberseguridad'],
  policiales: ['policiales', 'seguridad', 'crimen', 'justicia', 'robo', 'asesinato', 'delito', 'policía', 'detención', 'investigación'],
  salud: ['salud', 'medicina', 'hospitales', 'pandemia', 'vacuna', 'enfermedad', 'médico', 'tratamiento', 'paciente', 'síntoma'],
  educacion: ['educación', 'universidades', 'escuelas', 'docentes', 'estudiantes', 'clases', 'profesor', 'maestro', 'campus', 'cursada'],
  cultura: ['cultura', 'arte', 'música', 'teatro', 'literatura', 'artista', 'exposición', 'concierto', 'libro', 'escritor'],
  ciencia: ['ciencia', 'investigación', 'conicet', 'descubrimiento', 'estudio', 'científico', 'experimento', 'universidad', 'laboratorio', 'avance'],
  medioambiente: ['medio ambiente', 'clima', 'ecología', 'contaminación', 'ambiental', 'naturaleza', 'sustentable', 'cambio climático', 'biodiversidad', 'emisiones']
};

/**
 * Clasificar automáticamente una noticia según su contenido
 * Analiza título y descripción para determinar la categoría más apropiada
 * @param {string} title - Título de la noticia
 * @param {string} description - Descripción de la noticia
 * @param {array} candidateCategories - Categorías candidatas (opcional, si se especificaron en búsqueda)
 * @returns {string} - Categoría detectada o 'general'
 */
const classifyNewsCategory = (title, description, candidateCategories = []) => {
  const text = `${title} ${description}`.toLowerCase();
  const scores = {};

  // Categorías a analizar (si hay candidatas, solo esas; si no, todas)
  const categoriesToCheck = candidateCategories.length > 0
    ? candidateCategories
    : Object.keys(TEMATICAS);

  // Calcular puntaje para cada categoría
  for (const category of categoriesToCheck) {
    const keywords = TEMATICAS[category];
    if (!keywords) continue;

    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        // Ponderación: primera keyword vale más (es la más representativa)
        const weight = keywords.indexOf(keyword) === 0 ? 3 : 1;
        score += matches.length * weight;
      }
    }

    if (score > 0) {
      scores[category] = score;
    }
  }

  // Si no hay coincidencias, devolver 'general' o la primera candidata
  if (Object.keys(scores).length === 0) {
    return candidateCategories.length > 0 ? candidateCategories[0] : 'general';
  }

  // Devolver la categoría con mayor puntaje
  const bestCategory = Object.keys(scores).reduce((a, b) =>
    scores[a] > scores[b] ? a : b
  );

  return bestCategory;
};

/**
 * Construir URL de Google News para Argentina
 * Formato correcto: https://news.google.com/rss/search?q=QUERY&hl=es-419&gl=AR&ceid=AR:es-419
 * @param {string} query - Búsqueda
 * @param {object} options - Opciones
 * @param {number} options.hoursAgo - Filtrar por últimas X horas (ej: 3 = últimas 3 horas)
 */
const buildGoogleNewsUrl = (query, options = {}) => {
  const { region = 'AR', hoursAgo = null } = options;

  // Usar es-419 para español latinoamericano (mejor cobertura Argentina)
  const language = 'es-419';

  // Agregar filtro de tiempo si se especifica
  // NOTA: Solo usar when: para búsquedas generales (menos de 24h)
  // Para temáticas específicas, no usar when: porque reduce demasiado los resultados
  // El filtro por fecha exacta se aplica después en el backend
  let searchQuery = query;
  if (hoursAgo && hoursAgo <= 24) {
    // Solo para búsquedas de últimas 24 horas usar when:1d
    searchQuery = `${query} when:1d`;
  }
  // Para más de 24 horas, NO usar when: - dejar que Google devuelva más resultados
  // y filtrar después en el backend por fecha

  // Codificar la query
  const encodedQuery = encodeURIComponent(searchQuery);

  // URL de Google News RSS para Argentina (es-419 = español latinoamericano)
  return `https://news.google.com/rss/search?q=${encodedQuery}&hl=${language}&gl=${region}&ceid=${region}:${language}`;
};

/**
 * Decodificar URL real desde el formato base64/protobuf de Google News
 * Google News usa un formato propietario que codifica la URL
 * Formato: CBMi[base64_url]...
 */
const decodeGoogleNewsUrl = (googleUrl) => {
  try {
    // Extraer el ID del artículo (la parte codificada)
    const match = googleUrl.match(/articles\/([^?]+)/);
    if (!match) return null;

    const encodedId = match[1];

    // Método 1: Decodificar base64 estándar y buscar URL
    try {
      const base64Chars = encodedId.replace(/-/g, '+').replace(/_/g, '/');
      // Agregar padding si es necesario
      const paddedBase64 = base64Chars + '='.repeat((4 - base64Chars.length % 4) % 4);
      const decoded = Buffer.from(paddedBase64, 'base64').toString('utf-8');

      // Buscar URLs en el resultado decodificado
      const urlMatches = decoded.match(/https?:\/\/[^\s"'<>\x00-\x1f\x7f]+/g);
      if (urlMatches) {
        for (const urlCandidate of urlMatches) {
          // Limpiar la URL de caracteres basura al final
          let url = urlCandidate
            .replace(/[\x00-\x1f\x7f-\x9f]+.*$/, '')
            .replace(/[^\x20-\x7E]+$/, '');

          // Verificar que es una URL válida y no de Google
          if (url.startsWith('http') &&
              url.length > 20 &&
              !url.includes('google.com') &&
              !url.includes('gstatic.com')) {
            return url;
          }
        }
      }
    } catch (e) {
      // Base64 estándar falló
    }

    // Método 2: El formato CBMi tiene la URL después de ciertos bytes
    // CBMi = 0x08 0x13 0x22 (campo protobuf) seguido de longitud y URL
    try {
      const base64Chars = encodedId.replace(/-/g, '+').replace(/_/g, '/');
      const buffer = Buffer.from(base64Chars, 'base64');
      const str = buffer.toString('binary');

      // Buscar "http" en el buffer binario
      const httpIndex = str.indexOf('http');
      if (httpIndex !== -1) {
        // Extraer desde http hasta el final o hasta un byte de control
        let url = '';
        for (let i = httpIndex; i < str.length; i++) {
          const charCode = str.charCodeAt(i);
          // Caracteres ASCII imprimibles válidos en URLs
          if (charCode >= 0x21 && charCode <= 0x7E) {
            url += str[i];
          } else if (charCode === 0x20) {
            // Espacio termina la URL
            break;
          } else if (url.length > 10) {
            // Ya tenemos suficiente URL, parar
            break;
          }
        }

        if (url.startsWith('http') &&
            url.length > 20 &&
            !url.includes('google.com')) {
          // Limpiar caracteres extra al final
          url = url.replace(/[^a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+$/, '');
          return url;
        }
      }
    } catch (e) {
      // Método binario falló
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Extraer URL real de un enlace de Google News
 * Google News redirige a través de su propio dominio
 */
const extractRealUrl = async (googleUrl) => {
  try {
    // Si no es una URL de Google News, devolver tal cual
    if (!googleUrl.includes('news.google.com')) {
      return googleUrl;
    }

    // Intentar extraer de la URL directamente si tiene el parámetro url=
    const urlMatch = googleUrl.match(/url=([^&]+)/);
    if (urlMatch) {
      return decodeURIComponent(urlMatch[1]);
    }

    // Método 1: Intentar decodificar base64 (más rápido, no requiere request)
    const decodedUrl = decodeGoogleNewsUrl(googleUrl);
    if (decodedUrl) {
      return decodedUrl;
    }

    // Método 2: Seguir redirección con GET request
    try {
      const response = await axios.get(googleUrl, {
        maxRedirects: 10,
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
          'Referer': 'https://news.google.com/'
        }
      });

      // Verificar URL final después de redirecciones
      const finalUrl = response.request?.res?.responseUrl || response.request?.responseURL;
      if (finalUrl && !finalUrl.includes('news.google.com')) {
        return finalUrl;
      }

      // Buscar canonical en el HTML
      const $ = cheerio.load(response.data);
      const canonical = $('link[rel="canonical"]').attr('href');
      if (canonical && !canonical.includes('news.google.com')) {
        return canonical;
      }

      // Buscar meta refresh
      const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
      if (metaRefresh) {
        const refreshMatch = metaRefresh.match(/url=(.+)/i);
        if (refreshMatch) {
          return refreshMatch[1].trim();
        }
      }

    } catch (getError) {
      // Request falló
    }

    // Si todo falla, devolver la URL original
    return googleUrl;
  } catch (error) {
    return googleUrl;
  }
};

/**
 * Extraer imagen Open Graph de una página web (optimizado con timeout corto)
 */
const extractImageFromPage = async (url) => {
  try {
    // Timeout muy corto para no bloquear
    const response = await axios.get(url, {
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9'
      },
      maxRedirects: 2,
      // Solo leer los primeros 50KB (suficiente para meta tags)
      maxContentLength: 50000
    });

    const $ = cheerio.load(response.data);

    // Intentar obtener imagen en orden de preferencia (solo meta tags, más rápido)
    let image = null;

    // 1. Open Graph image (la más común y mejor calidad)
    image = $('meta[property="og:image"]').attr('content');
    if (image && image.startsWith('http')) return image;

    // 2. Twitter card image
    image = $('meta[name="twitter:image"]').attr('content');
    if (image && image.startsWith('http')) return image;

    // 3. Schema.org image
    image = $('meta[itemprop="image"]').attr('content');
    if (image && image.startsWith('http')) return image;

    return null;
  } catch (error) {
    // Silenciar errores de extracción de imagen
    return null;
  }
};

/**
 * Parsear RSS de Google News
 */
const parseGoogleNewsRss = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const items = [];

    $('item').each((index, element) => {
      if (index >= 20) return; // Limitar a 20 items

      const $item = $(element);
      const title = $item.find('title').text().trim();
      const link = $item.find('link').text().trim();
      const pubDate = $item.find('pubDate').text().trim();
      const description = $item.find('description').text().trim();

      // Extraer fuente del título (viene después de " - ")
      const sourceSeparator = title.lastIndexOf(' - ');
      const cleanTitle = sourceSeparator > 0 ? title.substring(0, sourceSeparator) : title;
      const source = sourceSeparator > 0 ? title.substring(sourceSeparator + 3) : 'Google News';

      items.push({
        title: cleanTitle,
        link: link,
        pubDate: pubDate ? new Date(pubDate) : new Date(),
        description: description.replace(/<[^>]*>/g, '').trim(),
        source: source,
        googleUrl: link
      });
    });

    return items;
  } catch (error) {
    console.error('Error parseando Google News RSS:', error.message);
    return [];
  }
};

/**
 * Extraer imagen de Google News
 * Google News muestra páginas con JavaScript que no redirigen directamente,
 * pero sí incluyen imágenes og:image de Google (thumbnails).
 * Estas imágenes son válidas y funcionan bien como thumbnails de noticias.
 */
const extractImageFromGoogleNewsUrl = async (googleUrl) => {
  try {
    // Hacer request a la página de Google News
    const response = await axios.get(googleUrl, {
      timeout: 5000,
      maxRedirects: 10,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9'
      }
    });

    const $ = cheerio.load(response.data);

    // Extraer imagen OG - las imágenes de Google (lh3.googleusercontent.com) son válidas
    let image = $('meta[property="og:image"]').attr('content');
    if (image && image.startsWith('http')) {
      // Mejorar resolución de imágenes de Google (cambiar de w300 a w600)
      if (image.includes('googleusercontent.com')) {
        image = image.replace(/=s\d+-w\d+/, '=s0-w600').replace(/=w\d+/, '=w600');
      }
      return image;
    }

    // Twitter image como fallback
    image = $('meta[name="twitter:image"]').attr('content');
    if (image && image.startsWith('http')) {
      if (image.includes('googleusercontent.com')) {
        image = image.replace(/=s\d+-w\d+/, '=s0-w600').replace(/=w\d+/, '=w600');
      }
      return image;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Buscar noticias en Google News
 * NOTA: extractImages desactivado por defecto porque Google News devuelve
 * la misma imagen genérica para todas las noticias y agrega 5-8 segundos de demora
 */
const searchGoogleNews = async (query, options = {}) => {
  const { maxItems = 10, extractRealUrls = false, extractImages = false } = options;

  const url = buildGoogleNewsUrl(query, options);
  let items = await parseGoogleNewsRss(url);

  // Limitar cantidad
  items = items.slice(0, maxItems);

  // Extraer imágenes en paralelo (optimizado)
  if (extractImages && items.length > 0) {
    // Procesar en paralelo con Promise.allSettled para no fallar si alguno falla
    const imagePromises = items.map(async (item) => {
      try {
        // Método directo: seguir redirects de Google News y extraer imagen
        const image = await extractImageFromGoogleNewsUrl(item.link);
        if (image) {
          item.image = image;
        }
      } catch (error) {
        // Silenciar errores individuales
      }
      return item;
    });

    // Esperar todas las promesas (máximo 8 segundos total)
    const results = await Promise.race([
      Promise.allSettled(imagePromises),
      new Promise(resolve => setTimeout(() => resolve(items.map(i => ({ status: 'fulfilled', value: i }))), 8000))
    ]);

    // Actualizar items con los resultados
    items = results.map((result, index) =>
      result.status === 'fulfilled' ? result.value : items[index]
    );
  }

  return items;
};

/**
 * Buscar noticias por provincia
 */
const searchByProvincia = async (provincia, options = {}) => {
  const { tematica = null, localidad = null, maxItems = 10 } = options;

  let query = provincia;

  if (localidad) {
    query = `${localidad} ${provincia}`;
  }

  if (tematica && TEMATICAS[tematica]) {
    query = `${query} ${TEMATICAS[tematica][0]}`;
  }

  query = `${query} Argentina noticias`;

  return searchGoogleNews(query, { maxItems, ...options });
};

/**
 * Buscar noticias por temática
 */
const searchByTematica = async (tematica, options = {}) => {
  const { provincia = null, maxItems = 10 } = options;

  const keywords = TEMATICAS[tematica] || [tematica];
  let query = keywords.slice(0, 2).join(' ');

  if (provincia) {
    query = `${query} ${provincia}`;
  }

  query = `${query} Argentina`;

  return searchGoogleNews(query, { maxItems, ...options });
};

/**
 * Buscar con filtros combinados
 * PRIORIDAD: keywords > temáticas > ubicación
 */
const searchWithFilters = async (filters = {}) => {
  const {
    tematicas = [],
    provincia = null,
    distrito = null,
    localidad = null,
    keywords = [],
    maxItems = 15,
    hoursAgo = 72  // Filtro de tiempo por defecto: 3 días
  } = filters;

  // Construir query - KEYWORDS SON PRIORITARIAS
  let queryParts = [];

  // 1. PRIMERO: Keywords personalizadas (lo más importante)
  // NOTA: Usar SOLO la primera keyword para evitar búsquedas muy restrictivas
  // Google busca TODAS las palabras, así que múltiples keywords = pocos/0 resultados
  if (keywords.length > 0) {
    // Usar solo la primera keyword (la más relevante)
    queryParts.push(keywords[0]);
  }

  // 2. SEGUNDO: Temáticas (solo si no hay keywords)
  if (keywords.length === 0 && tematicas.length > 0) {
    const tematicaKeywords = tematicas
      .map(t => TEMATICAS[t]?.[0] || t)
      .slice(0, 2);
    queryParts.push(tematicaKeywords.join(' '));
  }

  // 3. TERCERO: Ubicación geográfica
  if (localidad) {
    queryParts.push(localidad);
  }
  if (distrito) {
    queryParts.push(distrito);
  }
  if (provincia) {
    queryParts.push(provincia);
  }

  // 4. Agregar "Argentina noticias" para contextualizar
  if (queryParts.length > 0) {
    queryParts.push('Argentina noticias');
  }

  // Si no hay nada, buscar noticias generales de Argentina
  if (queryParts.length === 0) {
    queryParts.push('noticias Argentina hoy');
  }

  const query = queryParts.join(' ');
  console.log('Google News query:', query, '- hoursAgo:', hoursAgo); // Debug

  return searchGoogleNews(query, { maxItems, hoursAgo });
};

/**
 * Obtener lista de temáticas disponibles
 */
const getAvailableTematicas = () => {
  return Object.keys(TEMATICAS).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    keywords: TEMATICAS[key]
  }));
};

/**
 * Obtener lista de provincias
 */
const getProvincias = () => {
  return PROVINCIAS_ARGENTINA.map(p => ({
    id: p.toLowerCase().replace(/\s+/g, '-'),
    name: p
  }));
};

module.exports = {
  searchGoogleNews,
  searchByProvincia,
  searchByTematica,
  searchWithFilters,
  getAvailableTematicas,
  getProvincias,
  extractRealUrl,
  classifyNewsCategory,
  PROVINCIAS_ARGENTINA,
  TEMATICAS
};
