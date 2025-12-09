const express = require('express');
const router = express.Router();
const { authenticateAndRequireSubscription } = require('../middleware/authMiddleware');
const { getNewsFromFeeds, searchNews, getAvailableFeeds, getCategories } = require('../services/rssService');
const { searchGoogleNews, searchWithFilters, searchByProvincia, searchByTematica } = require('../services/googleNewsService');
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
      translate = 'false',
      shorten = 'true',
      generateEmojis = 'true',
      contentType = 'all' // with-image, with-video, text-only, all
    } = req.query;

    let allNews = [];

    // Parsear parámetros
    const tematicasList = tematicas ? tematicas.split(',').map(t => t.trim()) : [];
    const keywordsList = keywords ? keywords.split(',').map(k => k.trim()) : [];
    const excludeList = excludeTerms ? excludeTerms.split(',').map(e => e.trim()) : [];

    // Categorías RSS válidas
    const validRssCategories = ['nacionales', 'deportes', 'politica', 'economia', 'espectaculos', 'tecnologia', 'internacionales', 'policiales', 'buenosaires', 'cordoba', 'santafe', 'mendoza', 'tucuman', 'salta', 'misiones', 'rionegro', 'neuquen', 'chubut'];

    // Verificar si las temáticas coinciden con categorías RSS
    const matchingRssCategories = tematicasList.filter(t => validRssCategories.includes(t.toLowerCase()));

    console.log('Búsqueda RSS - Keywords:', keywordsList, 'Temáticas:', tematicasList, 'Provincia:', provincia);

    // SOLO RSS - Google News desactivado para mejor rendimiento y fiabilidad
    // Las búsquedas se hacen filtrando por categorías RSS + keywords en títulos/descripciones

    try {
      // Determinar categorías a buscar
      let rssCategories = matchingRssCategories;

      // Si no hay categorías específicas, buscar en nacionales por defecto
      if (rssCategories.length === 0) {
        rssCategories = ['nacionales'];
      }

      // Si hay provincia, agregar categoría provincial correspondiente
      if (provincia) {
        const provinciaKey = provincia.toLowerCase().replace(/\s+/g, '');
        if (validRssCategories.includes(provinciaKey)) {
          rssCategories.push(provinciaKey);
        }
      }

      const rssNews = await getNewsFromFeeds(rssCategories, {
        maxItems: parseInt(maxItems),
        keywords: q ? [q, ...keywordsList] : keywordsList,
        excludeTerms: excludeList
      });

      allNews = rssNews.map(n => ({ ...n, sourceType: 'rss' }));
      console.log(`RSS devolvió ${rssNews.length} resultados de categorías: ${rssCategories.join(', ')}`);
    } catch (err) {
      console.warn('Error en búsqueda RSS:', err.message);
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

module.exports = router;
