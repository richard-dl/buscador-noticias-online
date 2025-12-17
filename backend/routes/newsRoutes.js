const express = require('express');
const router = express.Router();
const { authenticateAndRequireSubscription } = require('../middleware/authMiddleware');
const { getNewsFromFeeds, searchNews, getAvailableFeeds, getCategories } = require('../services/rssService');
const { searchGoogleNews, searchWithFilters, searchByProvincia, searchByTematica, extractRealUrl } = require('../services/googleNewsService');
const { findImageByTitle } = require('../services/bingNewsService');
const axios = require('axios');
const cheerio = require('cheerio');
const { translateNews } = require('../services/translationService');
const { shortenUrl } = require('../services/shortenerService');
const { generateNewsEmojis, emojisToString } = require('../utils/emojiGenerator');
const { summarize, formatForSocialMedia } = require('../utils/summarizer');
const { saveSearchHistory } = require('../services/firebaseService');

/**
 * GET /api/news/feeds
 * Obtener lista de feeds RSS disponibles
 */
router.get('/feeds', (req, res) => {
  try {
    const feeds = getAvailableFeeds();
    const categories = getCategories();

    res.json({
      success: true,
      data: {
        feeds,
        categories
      }
    });
  } catch (error) {
    console.error('Error obteniendo feeds:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener feeds disponibles'
    });
  }
});

/**
 * GET /api/news/rss
 * Obtener noticias de feeds RSS
 */
router.get('/rss', authenticateAndRequireSubscription, async (req, res) => {
  try {
    const {
      categories = 'nacionales',
      maxItems = 10,
      hoursAgo = 48,
      keywords,
      excludeTerms,
      translate = 'false',
      shorten = 'true',
      generateEmojis = 'true'
    } = req.query;

    // Parsear categorías
    const categoryList = categories.split(',').map(c => c.trim());

    // Parsear keywords y exclusiones
    const keywordList = keywords ? keywords.split(',').map(k => k.trim()) : [];
    const excludeList = excludeTerms ? excludeTerms.split(',').map(e => e.trim()) : [];

    // Obtener noticias de RSS
    let news = await getNewsFromFeeds(categoryList, {
      maxItems: parseInt(maxItems),
      hoursAgo: parseInt(hoursAgo),
      keywords: keywordList,
      excludeTerms: excludeList
    });

    // Procesar cada noticia
    news = await Promise.all(news.map(async (item) => {
      // Traducir si es necesario
      if (translate === 'true') {
        item = await translateNews(item);
      }

      // Generar resumen
      item.summary = summarize(item.description, { maxSentences: 2 });

      // Acortar URL
      if (shorten === 'true' && item.link) {
        item.shortUrl = await shortenUrl(item.link);
      }

      // Generar emojis
      if (generateEmojis === 'true') {
        item.emojis = generateNewsEmojis(item);
        item.emojisString = emojisToString(item.emojis);
      }

      // Formato para redes
      item.formattedText = formatForSocialMedia(item);

      return item;
    }));

    // Guardar en historial
    await saveSearchHistory(req.user.uid, {
      query: categoryList.join(', '),
      filters: { categories: categoryList, keywords: keywordList },
      resultsCount: news.length
    });

    res.json({
      success: true,
      count: news.length,
      data: news
    });
  } catch (error) {
    console.error('Error obteniendo noticias RSS:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener noticias'
    });
  }
});

/**
 * GET /api/news/search
 * Buscar noticias con filtros avanzados
 */
router.get('/search', authenticateAndRequireSubscription, async (req, res) => {
  try {
    const {
      q, // Query de búsqueda
      tematicas,
      provincia,
      distrito,
      localidad,
      keywords,
      excludeTerms,
      sources = 'both', // rss, google, both
      maxItems = 15,
      hoursAgo = 72, // Filtro de antigüedad en horas (default 72h = 3 días)
      translate = 'false',
      shorten = 'true',
      generateEmojis = 'true',
      contentType = 'all' // with-image, with-video, text-only, all
    } = req.query;

    let allNews = [];

    // Parsear parámetros
    const tematicasList = tematicas ? tematicas.split(',').map(t => t.trim()) : [];
    let keywordsList = keywords ? keywords.split(',').map(k => k.trim()) : [];
    const excludeList = excludeTerms ? excludeTerms.split(',').map(e => e.trim()) : [];

    // Categorías RSS válidas (las que tienen feeds configurados)
    const validRssCategories = [
      // Categorías temáticas
      'nacionales', 'deportes', 'politica', 'economia', 'espectaculos', 'tecnologia',
      'internacionales', 'policiales',
      // Provincias (31 categorías provinciales)
      'buenosaires', 'catamarca', 'chaco', 'chubut', 'cordoba', 'corrientes',
      'entrerios', 'formosa', 'jujuy', 'lapampa', 'larioja', 'mendoza', 'misiones',
      'neuquen', 'rionegro', 'salta', 'sanjuan', 'sanluis', 'santacruz', 'santafe',
      'santiago', 'tierradelfuego', 'tucuman'
    ];

    // Mapeo de temáticas que NO son categorías RSS a keywords de búsqueda
    const tematicaToKeywords = {
      // Temáticas generales
      'ciencia': ['ciencia', 'científico', 'investigación', 'estudio', 'descubrimiento', 'laboratorio'],
      'salud': ['salud', 'medicina', 'hospital', 'médico', 'enfermedad', 'tratamiento', 'vacuna'],
      'educacion': ['educación', 'escuela', 'universidad', 'docentes', 'alumnos', 'educativo'],
      'cultura': ['cultura', 'arte', 'música', 'teatro', 'literatura', 'cultural'],
      'medioambiente': ['medio ambiente', 'ecología', 'clima', 'contaminación', 'ambiental'],
      'sociedad': ['sociedad', 'comunidad', 'vecinos', 'barrio', 'social'],
      'turismo': ['turismo', 'viajes', 'vacaciones', 'hotel', 'turístico'],
      // Temáticas por edad
      'infantil': ['niños', 'infantil', 'chicos', 'menores', 'niñez'],
      'adolescentes': ['adolescentes', 'jóvenes', 'juventud', 'secundaria', 'adolescencia'],
      'adultos': ['adultos', 'trabajo', 'empleo', 'adulto'],
      'adultos-mayores': ['jubilados', 'adultos mayores', 'tercera edad', 'pensiones', 'jubilación'],
      // Temáticas por género
      'masculino': ['hombres', 'masculino', 'varones', 'masculina'],
      'femenino': ['mujeres', 'femenino', 'femenina', 'mujer'],
      'genero-diversidad': ['diversidad', 'LGBTQ', 'género', 'inclusión', 'diversidad sexual'],
      // Temáticas por religión
      'religion': ['religión', 'fe', 'iglesia', 'religioso', 'templo', 'culto', 'espiritual'],
      'catolicismo': ['católico', 'papa', 'iglesia católica', 'vaticano', 'obispo', 'catolicismo', 'misa'],
      'judaismo': ['judío', 'judaísmo', 'sinagoga', 'rabino', 'judía', 'hebreo'],
      'islam': ['islam', 'musulmán', 'mezquita', 'islámico', 'musulmana', 'alá', 'corán', 'imán'],
      'evangelico': ['evangélico', 'pastor', 'iglesia evangélica', 'evangélica', 'evangelismo']
    };

    // Separar temáticas válidas RSS de las que deben convertirse a keywords
    const matchingRssCategories = [];
    const additionalKeywords = [];

    for (const tematica of tematicasList) {
      const tematicaLower = tematica.toLowerCase();
      if (validRssCategories.includes(tematicaLower)) {
        matchingRssCategories.push(tematicaLower);
      } else if (tematicaToKeywords[tematicaLower]) {
        // Agregar keywords de búsqueda para esta temática
        additionalKeywords.push(...tematicaToKeywords[tematicaLower]);
      }
    }

    // Combinar keywords del usuario con keywords de temáticas
    keywordsList = [...keywordsList, ...additionalKeywords];

    // IMPORTANTE: Agregar localidad y distrito como keywords para filtrar mejor
    // Esto permite que RSS también filtre por ubicación específica
    if (localidad) {
      keywordsList.push(localidad);
    }
    if (distrito && distrito !== localidad) {
      keywordsList.push(distrito);
    }

    // Normalizar provincia (quitar guiones para coincidir con RSS)
    const provinciaKey = provincia ? provincia.toLowerCase().replace(/[\s-]+/g, '') : null;

    console.log('Búsqueda RSS + Google News - Keywords:', keywordsList, 'Temáticas RSS:', matchingRssCategories, 'Provincia:', provincia, '(key:', provinciaKey, '), Localidad:', localidad, 'Distrito:', distrito);

    // Búsqueda combinada: RSS + Google News para mejor cobertura
    // RSS: categorías específicas + feeds locales
    // Google News: búsqueda por ubicación y keywords

    try {
      // Determinar categorías RSS a buscar
      let rssCategories = [...matchingRssCategories];

      // Si hay provincia, agregar categoría provincial
      if (provinciaKey && validRssCategories.includes(provinciaKey)) {
        if (!rssCategories.includes(provinciaKey)) {
          rssCategories.push(provinciaKey);
        }
      }

      // Si no hay categorías específicas, determinar qué buscar
      if (rssCategories.length === 0) {
        if (keywordsList.length > 0 || provinciaKey) {
          // Con keywords o provincia: buscar en categorías generales para mayor cobertura
          rssCategories = ['nacionales', 'deportes', 'politica', 'economia', 'policiales'];
        } else {
          // Sin nada: solo nacionales
          rssCategories = ['nacionales'];
        }
      }

      const rssNews = await getNewsFromFeeds(rssCategories, {
        maxItems: parseInt(maxItems),
        hoursAgo: parseInt(hoursAgo),
        keywords: q ? [q, ...keywordsList] : keywordsList,
        excludeTerms: excludeList
      });

      allNews = rssNews.map(n => ({ ...n, sourceType: 'rss' }));
      console.log(`RSS devolvió ${rssNews.length} resultados de categorías: ${rssCategories.join(', ')}`);
    } catch (err) {
      console.warn('Error en búsqueda RSS:', err.message);
    }

    // Búsqueda en Google News para complementar (especialmente útil para geografía)
    try {
      const googleNews = await searchWithFilters({
        q: q,
        tematicas: tematicasList,
        provincia: provincia,
        distrito: distrito,
        localidad: localidad,
        keywords: keywordsList,
        excludeTerms: excludeList,
        maxItems: Math.ceil(parseInt(maxItems) / 2),
        hoursAgo: parseInt(hoursAgo)  // Pasar filtro de tiempo a Google News
      });

      // Agregar categoría basada en la primera temática buscada (si existe)
      const categoryForGoogleNews = tematicasList.length > 0 ? tematicasList[0] : 'general';

      allNews = allNews.concat(googleNews.map(n => ({
        ...n,
        sourceType: 'google',
        category: categoryForGoogleNews
      })));
      console.log(`Google News devolvió ${googleNews.length} resultados`);
    } catch (err) {
      console.warn('Error en búsqueda Google News:', err.message);
    }

    // Eliminar duplicados por título similar
    const seenTitles = new Set();
    allNews = allNews.filter(news => {
      const normalizedTitle = news.title.toLowerCase().substring(0, 50);
      if (seenTitles.has(normalizedTitle)) {
        return false;
      }
      seenTitles.add(normalizedTitle);
      return true;
    });

    // Ordenar por fecha
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // FILTRAR POR FECHA - aplicar hoursAgo a TODOS los resultados (RSS + Google)
    const hoursAgoInt = parseInt(hoursAgo);
    if (hoursAgoInt && hoursAgoInt < 72) {
      // Solo aplicar filtro estricto si es menos de 3 días
      const cutoffDate = new Date(Date.now() - hoursAgoInt * 60 * 60 * 1000);
      const beforeFilter = allNews.length;
      const filteredNews = allNews.filter(news => {
        const pubDate = news.pubDate ? new Date(news.pubDate) : null;
        return pubDate && pubDate > cutoffDate;
      });

      // Si el filtro es muy estricto y no hay resultados, usar las más recientes
      if (filteredNews.length === 0 && beforeFilter > 0) {
        console.log(`Filtro de fecha (${hoursAgoInt}h): muy estricto, usando ${Math.min(beforeFilter, 10)} más recientes`);
        allNews = allNews.slice(0, Math.min(beforeFilter, parseInt(maxItems)));
      } else {
        allNews = filteredNews;
        console.log(`Filtro de fecha (${hoursAgoInt}h): ${beforeFilter} -> ${allNews.length} noticias`);
      }
    }

    // NOTA: El filtrado por distrito/localidad se hace mediante keywords
    // Los feeds RSS raramente incluyen distrito específico en título/descripción
    // Por lo tanto, el usuario debe agregar el distrito como keyword para filtrar

    // Filtrar por tipo de contenido
    if (contentType && contentType !== 'all') {
      allNews = allNews.filter(news => {
        const hasImage = news.image && news.image.length > 0;
        const hasVideo = news.link && (
          news.link.includes('youtube.com') ||
          news.link.includes('youtu.be') ||
          news.link.includes('vimeo.com') ||
          news.description?.toLowerCase().includes('video')
        );

        switch (contentType) {
          case 'with-image':
            return hasImage;
          case 'with-video':
            return hasVideo;
          case 'text-only':
            return !hasImage && !hasVideo;
          default:
            return true;
        }
      });
    }

    // Limitar resultados
    allNews = allNews.slice(0, parseInt(maxItems));

    // Procesar cada noticia
    allNews = await Promise.all(allNews.map(async (item) => {
      // Traducir si es necesario
      if (translate === 'true') {
        item = await translateNews(item);
      }

      // Generar resumen
      item.summary = summarize(item.description, { maxSentences: 2 });

      // Acortar URL
      if (shorten === 'true' && item.link) {
        try {
          item.shortUrl = await shortenUrl(item.link);
        } catch (err) {
          item.shortUrl = item.link;
        }
      }

      // Generar emojis
      if (generateEmojis === 'true') {
        item.emojis = generateNewsEmojis(item);
        item.emojisString = emojisToString(item.emojis);
      }

      // Formato para redes
      item.formattedText = formatForSocialMedia(item);

      return item;
    }));

    // Guardar en historial (solo incluir valores definidos)
    const historyFilters = {
      tematicas: tematicasList,
      keywords: keywordsList
    };
    if (provincia) historyFilters.provincia = provincia;
    if (localidad) historyFilters.localidad = localidad;
    if (distrito) historyFilters.distrito = distrito;

    await saveSearchHistory(req.user.uid, {
      query: q || tematicasList.join(', ') || 'búsqueda general',
      filters: historyFilters,
      resultsCount: allNews.length
    });

    res.json({
      success: true,
      count: allNews.length,
      filters: {
        query: q,
        tematicas: tematicasList,
        provincia,
        distrito,
        localidad
      },
      data: allNews
    });
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({
      success: false,
      error: 'Error al buscar noticias'
    });
  }
});

/**
 * POST /api/news/generate
 * Generar texto formateado de noticias
 */
router.post('/generate', authenticateAndRequireSubscription, async (req, res) => {
  try {
    const {
      profileId, // ID de perfil guardado
      filters = {},
      count = 5,
      format = 'social' // social, plain, list
    } = req.body;

    let searchFilters = filters;

    // Si hay profileId, cargar el perfil
    if (profileId) {
      const { getSearchProfiles } = require('../services/firebaseService');
      const profiles = await getSearchProfiles(req.user.uid);
      const profile = profiles.find(p => p.id === profileId);

      if (profile) {
        searchFilters = {
          tematicas: profile.tematicas,
          provincia: profile.provincia,
          distrito: profile.distrito,
          localidad: profile.localidad,
          keywords: profile.keywords,
          excludeTerms: profile.excludeTerms,
          preferredSources: profile.preferredSources
        };
      }
    }

    // Construir query string para la búsqueda
    const queryParams = new URLSearchParams({
      tematicas: searchFilters.tematicas?.join(',') || '',
      provincia: searchFilters.provincia || '',
      distrito: searchFilters.distrito || '',
      localidad: searchFilters.localidad || '',
      keywords: searchFilters.keywords?.join(',') || '',
      excludeTerms: searchFilters.excludeTerms?.join(',') || '',
      maxItems: count.toString(),
      translate: 'true',
      shorten: 'true',
      generateEmojis: 'true'
    });

    // Simular request interno (reutilizar lógica de búsqueda)
    let news = [];

    // Buscar en ambas fuentes
    const tematicasList = searchFilters.tematicas || [];
    const keywordsList = searchFilters.keywords || [];

    // RSS
    try {
      const rssNews = await getNewsFromFeeds(
        tematicasList.length > 0 ? tematicasList : ['nacionales'],
        { maxItems: Math.ceil(count / 2), keywords: keywordsList }
      );
      news = news.concat(rssNews);
    } catch (err) {
      console.warn('Error RSS:', err.message);
    }

    // Google News
    try {
      const googleNews = await searchWithFilters({
        ...searchFilters,
        maxItems: Math.ceil(count / 2)
      });
      news = news.concat(googleNews);
    } catch (err) {
      console.warn('Error Google:', err.message);
    }

    // Procesar noticias
    news = news.slice(0, count);

    const processedNews = await Promise.all(news.map(async (item) => {
      // Traducir
      item = await translateNews(item);

      // Resumen
      item.summary = summarize(item.description, { maxSentences: 2 });

      // Acortar URL
      if (item.link) {
        try {
          item.shortUrl = await shortenUrl(item.link);
        } catch (e) {
          item.shortUrl = item.link;
        }
      }

      // Emojis
      item.emojis = generateNewsEmojis(item);
      item.emojisString = emojisToString(item.emojis);

      // Formato
      item.formattedText = formatForSocialMedia(item);

      return item;
    }));

    // Generar texto final según formato
    let generatedText = '';

    if (format === 'list') {
      generatedText = processedNews
        .map((n, i) => `${i + 1}. ${n.title}\n   ${n.shortUrl || n.link}`)
        .join('\n\n');
    } else {
      generatedText = processedNews
        .map(n => n.formattedText)
        .join('\n\n' + '─'.repeat(30) + '\n\n');
    }

    res.json({
      success: true,
      count: processedNews.length,
      generatedText,
      news: processedNews
    });
  } catch (error) {
    console.error('Error generando noticias:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar noticias'
    });
  }
});

/**
 * GET /api/news/extract-image
 * Extraer imagen og:image de una URL (para noticias de Google News sin imagen)
 * Cache simple en memoria para evitar requests repetidos
 */
const imageCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

/**
 * Imagen genérica de Google News que se devuelve para todas las noticias
 * Esta imagen es un placeholder y no es útil mostrarla
 */
const GOOGLE_NEWS_GENERIC_IMAGE = 'J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrpY4bEeIBuc';

/**
 * Verificar si una imagen es la genérica de Google News
 */
const isGoogleNewsGenericImage = (imageUrl) => {
  if (!imageUrl) return false;
  return imageUrl.includes(GOOGLE_NEWS_GENERIC_IMAGE);
};

/**
 * Extraer imagen de una página web normal (no Google News)
 */
const extractImageFromPage = async (url) => {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9'
      },
      maxRedirects: 5,
      maxContentLength: 100000
    });

    const $ = cheerio.load(response.data);

    // Intentar obtener imagen en orden de preferencia
    let image = $('meta[property="og:image"]').attr('content');
    if (image && image.startsWith('http')) return image;

    image = $('meta[name="twitter:image"]').attr('content');
    if (image && image.startsWith('http')) return image;

    image = $('meta[itemprop="image"]').attr('content');
    if (image && image.startsWith('http')) return image;

    // Primera imagen grande en el contenido
    $('article img, .article img, main img, .content img').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http') && !src.includes('avatar') && !src.includes('logo') && !src.includes('icon')) {
        image = src;
        return false;
      }
    });

    return image || null;
  } catch (e) {
    return null;
  }
};

/**
 * Extraer imagen de una página de Google News
 * Intenta obtener la URL real y extraer la imagen de la fuente original
 */
const extractImageFromGoogleNews = async (googleNewsUrl) => {
  try {
    // Primero intentar resolver la URL real
    const realUrl = await extractRealUrl(googleNewsUrl);

    // Si pudimos obtener la URL real (diferente de Google News), extraer imagen de ahí
    if (realUrl && !realUrl.includes('news.google.com')) {
      const image = await extractImageFromPage(realUrl);
      if (image && !isGoogleNewsGenericImage(image)) {
        return image;
      }
    }

    // Fallback: extraer de la página de Google News (aunque puede ser genérica)
    const response = await axios.get(googleNewsUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });

    if (response.data) {
      const $ = cheerio.load(response.data);
      let image = $('meta[property="og:image"]').attr('content');

      // Verificar que no sea la imagen genérica
      if (image && image.startsWith('http') && !isGoogleNewsGenericImage(image)) {
        if (image.includes('googleusercontent.com')) {
          image = image.replace(/=s\d+-w\d+/, '=s0-w600').replace(/=w\d+/, '=w600');
        }
        return image;
      }

      image = $('meta[name="twitter:image"]').attr('content');
      if (image && image.startsWith('http') && !isGoogleNewsGenericImage(image)) {
        if (image.includes('googleusercontent.com')) {
          image = image.replace(/=s\d+-w\d+/, '=s0-w600').replace(/=w\d+/, '=w600');
        }
        return image;
      }
    }
    return null;
  } catch (e) {
    if (e.response?.data) {
      try {
        const $ = cheerio.load(e.response.data);
        let image = $('meta[property="og:image"]').attr('content');
        if (image && image.startsWith('http') && !isGoogleNewsGenericImage(image)) {
          if (image.includes('googleusercontent.com')) {
            image = image.replace(/=s\d+-w\d+/, '=s0-w600').replace(/=w\d+/, '=w600');
          }
          return image;
        }
      } catch (parseErr) {}
    }
    return null;
  }
};

router.get('/extract-image', authenticateAndRequireSubscription, async (req, res) => {
  try {
    const { url, title } = req.query;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL requerida'
      });
    }

    // Verificar cache
    const cached = imageCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({
        success: true,
        image: cached.image,
        cached: true,
        source: cached.source
      });
    }

    let image = null;
    let imageSource = null;

    // Estrategia según el tipo de URL
    if (url.includes('news.google.com')) {
      // Para Google News: intentar extraer imagen
      image = await extractImageFromGoogleNews(url);

      // Si no hay imagen y tenemos título, buscar en Bing News como fallback
      if (!image && title) {
        console.log('Buscando imagen en Bing News para:', title.substring(0, 50));
        image = await findImageByTitle(title);
        if (image) {
          imageSource = 'bing';
          console.log('Imagen encontrada en Bing News');
        }
      }
    } else {
      // Para otras páginas: extraer og:image normalmente
      image = await extractImageFromPage(url);
    }

    // Guardar en cache (incluso si es null para evitar requests repetidos)
    imageCache.set(url, {
      image: image,
      timestamp: Date.now(),
      source: imageSource
    });

    // Limpiar cache viejo periódicamente
    if (imageCache.size > 500) {
      const now = Date.now();
      for (const [key, value] of imageCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          imageCache.delete(key);
        }
      }
    }

    res.json({
      success: true,
      image: image,
      cached: false,
      source: imageSource
    });
  } catch (error) {
    console.error('Error extrayendo imagen:', error);
    res.status(500).json({
      success: false,
      error: 'Error al extraer imagen'
    });
  }
});

module.exports = router;
