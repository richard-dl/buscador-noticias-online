const Parser = require('rss-parser');
const axios = require('axios');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

// Feeds RSS de medios argentinos organizados por categoría y región
// NOTA: Solo feeds verificados que funcionan (actualizado Dic 2024)
const RSS_FEEDS = {
  // Medios Nacionales
  nacionales: [
    { name: 'Clarín', url: 'https://www.clarin.com/rss/lo-ultimo/', category: 'general' },
    { name: 'La Nación', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/', category: 'general' },
    { name: 'Noticias Argentinas', url: 'https://noticiasargentinas.com/rss', category: 'general' },
    { name: 'Ámbito', url: 'https://www.ambito.com/rss/pages/home.xml', category: 'economia' },
    { name: 'Perfil', url: 'https://www.perfil.com/feed', category: 'general' },
    { name: 'El Diario AR', url: 'https://www.eldiarioar.com/rss', category: 'general' }
  ],

  // Deportes
  deportes: [
    { name: 'Olé', url: 'https://www.ole.com.ar/rss/', category: 'deportes' },
    { name: 'Clarín Deportes', url: 'https://www.clarin.com/rss/deportes/', category: 'deportes' }
  ],

  // Política
  politica: [
    { name: 'Clarín Política', url: 'https://www.clarin.com/rss/politica/', category: 'politica' },
    { name: 'Diagonales (La Plata)', url: 'https://www.diagonales.com/rss/', category: 'politica' }
  ],

  // Economía
  economia: [
    { name: 'Ámbito Finanzas', url: 'https://www.ambito.com/rss/pages/economia.xml', category: 'economia' },
    { name: 'Clarín Economía', url: 'https://www.clarin.com/rss/economia/', category: 'economia' },
    { name: 'Punto a Punto (Córdoba)', url: 'https://www.puntoapunto.com.ar/feed/', category: 'economia' }
  ],

  // Espectáculos
  espectaculos: [
    { name: 'Clarín Espectáculos', url: 'https://www.clarin.com/rss/espectaculos/', category: 'espectaculos' }
  ],

  // Tecnología
  tecnologia: [
    { name: 'Clarín Tecnología', url: 'https://www.clarin.com/rss/tecnologia/', category: 'tecnologia' }
  ],

  // Internacionales
  internacionales: [
    { name: 'Clarín Mundo', url: 'https://www.clarin.com/rss/mundo/', category: 'internacionales' }
  ],

  // Policiales
  policiales: [
    { name: 'Clarín Policiales', url: 'https://www.clarin.com/rss/policiales/', category: 'policiales' }
  ],

  // =====================
  // MEDIOS PROVINCIALES
  // =====================

  // Buenos Aires
  buenosaires: [
    { name: '0223 (Mar del Plata)', url: 'https://www.0223.com.ar/rss/', category: 'provincial', provincia: 'Buenos Aires' },
    { name: 'Diagonales (La Plata)', url: 'https://www.diagonales.com/rss/', category: 'provincial', provincia: 'Buenos Aires' }
  ],

  // Córdoba
  cordoba: [
    { name: 'El Diario de Carlos Paz', url: 'https://www.eldiariodecarlospaz.com.ar/rss/feed.html?r=3', category: 'provincial', provincia: 'Córdoba' },
    { name: 'Punto a Punto', url: 'https://www.puntoapunto.com.ar/feed/', category: 'provincial', provincia: 'Córdoba' }
  ],

  // Santa Fe
  santafe: [
    // Sin feeds verificados actualmente
  ],

  // Mendoza
  mendoza: [
    // Sin feeds verificados actualmente (MDZ y Los Andes no responden)
  ],

  // Tucumán
  tucuman: [
    // Sin feeds verificados actualmente
  ],

  // Salta
  salta: [
    { name: 'El Tribuno Salta', url: 'https://www.eltribuno.com/salta/feed', category: 'provincial', provincia: 'Salta' }
  ],

  // Misiones
  misiones: [
    { name: 'Primera Edición', url: 'https://www.primeraedicion.com.ar/feed/', category: 'provincial', provincia: 'Misiones' }
  ],

  // Río Negro / Patagonia
  rionegro: [
    { name: 'Diario Río Negro', url: 'https://www.rionegro.com.ar/feed/', category: 'provincial', provincia: 'Río Negro' }
  ],

  // Neuquén
  neuquen: [
    { name: 'Diario Río Negro', url: 'https://www.rionegro.com.ar/feed/', category: 'provincial', provincia: 'Neuquén' }
  ],

  // Chubut
  chubut: [
    { name: 'El Diario Web', url: 'https://www.eldiarioweb.com/feed/', category: 'provincial', provincia: 'Chubut' }
  ]
};

/**
 * Extraer imagen de un item RSS
 */
const extractImage = (item) => {
  // Intentar diferentes campos donde puede estar la imagen
  if (item.mediaContent?.$ ?.url) {
    return item.mediaContent.$.url;
  }
  if (item.mediaThumbnail?.$ ?.url) {
    return item.mediaThumbnail.$.url;
  }
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }

  // Buscar imagen en el contenido HTML
  const content = item.contentEncoded || item.content || item['content:encoded'] || '';
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
  if (imgMatch) {
    return imgMatch[1];
  }

  // Buscar en description
  const descMatch = (item.description || '').match(/<img[^>]+src="([^">]+)"/i);
  if (descMatch) {
    return descMatch[1];
  }

  return null;
};

/**
 * Limpiar HTML de un texto
 */
const cleanHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Filtrar noticias por fecha (últimas 72 horas / 3 días)
 */
const filterByDate = (items, hoursAgo = 72) => {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

  return items.filter(item => {
    const pubDate = item.pubDate ? new Date(item.pubDate) : null;
    return pubDate && pubDate > cutoff;
  });
};

/**
 * Parsear un feed RSS individual
 */
const parseFeed = async (feedInfo) => {
  try {
    const feed = await parser.parseURL(feedInfo.url);

    return feed.items.map(item => ({
      title: cleanHtml(item.title),
      description: cleanHtml(item.contentSnippet || item.description || ''),
      link: item.link,
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      image: extractImage(item),
      source: feedInfo.name,
      sourceUrl: feed.link || feedInfo.url,
      category: feedInfo.category,
      provincia: feedInfo.provincia || null
    }));
  } catch (error) {
    console.warn(`Error parseando feed ${feedInfo.name}:`, error.message);
    return []; // Fallback: devolver array vacío si falla
  }
};

/**
 * Obtener noticias de múltiples feeds
 */
const getNewsFromFeeds = async (feedKeys = ['nacionales'], options = {}) => {
  const { maxItems = 20, hoursAgo = 72, keywords = [], excludeTerms = [] } = options;

  let allFeeds = [];

  // Obtener los feeds solicitados
  for (const key of feedKeys) {
    if (RSS_FEEDS[key]) {
      allFeeds = allFeeds.concat(RSS_FEEDS[key]);
    }
  }

  if (allFeeds.length === 0) {
    allFeeds = RSS_FEEDS.nacionales;
  }

  // Parsear todos los feeds en paralelo
  const feedPromises = allFeeds.map(feed => parseFeed(feed));
  const results = await Promise.allSettled(feedPromises);

  // Combinar resultados exitosos
  let allNews = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allNews = allNews.concat(result.value);
    }
  }

  // Filtrar por fecha
  allNews = filterByDate(allNews, hoursAgo);

  // Filtrar por keywords si se especifican
  if (keywords.length > 0) {
    allNews = allNews.filter(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return keywords.some(kw => text.includes(kw.toLowerCase()));
    });
  }

  // Excluir términos
  if (excludeTerms.length > 0) {
    allNews = allNews.filter(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return !excludeTerms.some(term => text.includes(term.toLowerCase()));
    });
  }

  // Ordenar por fecha descendente
  allNews.sort((a, b) => b.pubDate - a.pubDate);

  // Limitar cantidad
  return allNews.slice(0, maxItems);
};

/**
 * Buscar noticias por texto libre
 */
const searchNews = async (query, options = {}) => {
  const { categories = ['nacionales'], maxItems = 20, hoursAgo = 48 } = options;

  const news = await getNewsFromFeeds(categories, {
    maxItems: maxItems * 3, // Obtener más para filtrar
    hoursAgo,
    keywords: query.split(' ').filter(w => w.length > 2)
  });

  return news.slice(0, maxItems);
};

/**
 * Obtener lista de feeds disponibles
 */
const getAvailableFeeds = () => {
  const result = {};

  for (const [key, feeds] of Object.entries(RSS_FEEDS)) {
    result[key] = feeds.map(f => ({
      name: f.name,
      category: f.category,
      provincia: f.provincia || null
    }));
  }

  return result;
};

/**
 * Obtener categorías disponibles
 */
const getCategories = () => {
  return Object.keys(RSS_FEEDS);
};

module.exports = {
  getNewsFromFeeds,
  searchNews,
  getAvailableFeeds,
  getCategories,
  RSS_FEEDS
};
