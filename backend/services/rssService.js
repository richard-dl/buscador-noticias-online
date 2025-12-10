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
// NOTA: Feeds verificados y funcionando (actualizado Dic 2025)
const RSS_FEEDS = {
  // =====================
  // MEDIOS NACIONALES
  // =====================
  nacionales: [
    { name: 'Clarín', url: 'https://www.clarin.com/rss/lo-ultimo/', category: 'general' },
    { name: 'La Nación', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/', category: 'general' },
    { name: 'Perfil', url: 'https://www.perfil.com/feed', category: 'general' },
    { name: 'Infobae', url: 'https://www.infobae.com/feeds/rss/', category: 'general' },
    { name: 'Página/12', url: 'https://www.pagina12.com.ar/rss/portada', category: 'general' },
    { name: 'Ámbito', url: 'https://www.ambito.com/rss/pages/home.xml', category: 'economia' }
  ],

  // Deportes
  deportes: [
    { name: 'Olé', url: 'https://www.ole.com.ar/rss/', category: 'deportes' },
    { name: 'Clarín Deportes', url: 'https://www.clarin.com/rss/deportes/', category: 'deportes' },
    { name: 'TyC Sports', url: 'https://www.tycsports.com/rss.xml', category: 'deportes' },
    { name: 'La Voz Deportes', url: 'https://www.lavoz.com.ar/rss/deportes.xml', category: 'deportes', provincia: 'Córdoba' },
    { name: 'Paraná Deportes', url: 'https://paranadeportes.com.ar/feed/', category: 'deportes', provincia: 'Entre Ríos' }
  ],

  // Política
  politica: [
    { name: 'Clarín Política', url: 'https://www.clarin.com/rss/politica/', category: 'politica' },
    { name: 'La Nación Política', url: 'https://www.lanacion.com.ar/politica/rss/', category: 'politica' },
    { name: 'Infobae Política', url: 'https://www.infobae.com/politica/feed/', category: 'politica' },
    { name: 'Rioja Política', url: 'https://riojapolitica.com.ar/feed/', category: 'politica', provincia: 'La Rioja' },
    { name: 'El Tribuno Salta Política', url: 'https://www.eltribuno.com/rss-new/salta/politica.rss', category: 'politica', provincia: 'Salta' }
  ],

  // Economía
  economia: [
    { name: 'Ámbito Finanzas', url: 'https://www.ambito.com/rss/pages/economia.xml', category: 'economia' },
    { name: 'Clarín Economía', url: 'https://www.clarin.com/rss/economia/', category: 'economia' },
    { name: 'San Juan Minero', url: 'https://sanjuanminero.com.ar/feed/', category: 'economia', provincia: 'San Juan' },
    { name: 'Agro Misiones', url: 'https://agromisiones.com.ar/feed/', category: 'economia', provincia: 'Misiones' }
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
    { name: 'Clarín Policiales', url: 'https://www.clarin.com/rss/policiales/', category: 'policiales' },
    { name: 'El Litoral Policiales', url: 'https://www.ellitoral.com.ar/rss/policiales.xml', category: 'policiales', provincia: 'Corrientes' },
    { name: 'El Tribuno Salta Policiales', url: 'https://www.eltribuno.com/rss-new/salta/policiales.rss', category: 'policiales', provincia: 'Salta' }
  ],

  // =====================
  // MEDIOS PROVINCIALES (74 feeds verificados Dic 2025)
  // =====================

  // Buenos Aires (7 feeds)
  buenosaires: [
    { name: 'Clarín', url: 'https://www.clarin.com/rss/lo-ultimo/', category: 'provincial', provincia: 'Buenos Aires', ciudad: 'Capital/AMBA' },
    { name: 'Compromiso (Dolores)', url: 'https://compromisodiario.com.ar/feed/', category: 'provincial', provincia: 'Buenos Aires', ciudad: 'Dolores' },
    { name: 'Qué Digital (Mar del Plata)', url: 'https://www.quedigital.com.ar/feed/', category: 'provincial', provincia: 'Buenos Aires', ciudad: 'General Pueyrredón' },
    { name: 'La Posta del Noroeste (Lincoln)', url: 'https://www.lapostadelnoroeste.com.ar/feed/', category: 'provincial', provincia: 'Buenos Aires', ciudad: 'Lincoln' },
    { name: 'La Capital (Mar del Plata)', url: 'https://www.lacapitalmdp.com/feed/', category: 'provincial', provincia: 'Buenos Aires', ciudad: 'Mar del Plata' },
    { name: 'Pinamar Diario', url: 'https://pinamardiario.com.ar/feed/', category: 'provincial', provincia: 'Buenos Aires', ciudad: 'Pinamar' },
    { name: 'Diario El Norte (San Nicolás)', url: 'https://www.diarioelnorte.com.ar/feed/', category: 'provincial', provincia: 'Buenos Aires', ciudad: 'San Nicolás' }
  ],

  // Catamarca (2 feeds)
  catamarca: [
    { name: 'Belén Info', url: 'https://beleninfo.com.ar/feed/', category: 'provincial', provincia: 'Catamarca', ciudad: 'Belén' },
    { name: 'Catamarca Digital', url: 'https://catamarcadigital.com/feed/', category: 'provincial', provincia: 'Catamarca', ciudad: 'Catamarca Capital' }
  ],

  // Chaco (2 feeds)
  chaco: [
    { name: 'Chaco Día por Día', url: 'https://www.chacodiapordia.com/feed/', category: 'provincial', provincia: 'Chaco', ciudad: 'Resistencia' },
    { name: 'El Diario de la Región', url: 'https://eldiariodelaregion.com.ar/feed/', category: 'provincial', provincia: 'Chaco', ciudad: 'Resistencia' }
  ],

  // Chubut (1 feed)
  chubut: [
    { name: 'Comodoro 24', url: 'https://comodoro24.com.ar/feed/', category: 'provincial', provincia: 'Chubut', ciudad: 'Comodoro Rivadavia' }
  ],

  // Córdoba (5 feeds)
  cordoba: [
    { name: 'Carlos Paz Hoy', url: 'https://carlospazhoy.com.ar/feed/', category: 'provincial', provincia: 'Córdoba', ciudad: 'Carlos Paz' },
    { name: 'Carlos Paz Vivo', url: 'https://carlospazvivo.com/feed/', category: 'provincial', provincia: 'Córdoba', ciudad: 'Carlos Paz' },
    { name: 'La Voz Deportes', url: 'https://www.lavoz.com.ar/rss/deportes.xml', category: 'provincial', provincia: 'Córdoba', ciudad: 'Córdoba Capital' },
    { name: 'Perfil Córdoba', url: 'https://www.perfil.com/feed/cordoba', category: 'provincial', provincia: 'Córdoba', ciudad: 'Córdoba Capital' },
    { name: 'Villa María Ya', url: 'https://villamariaya.com/feed/', category: 'provincial', provincia: 'Córdoba', ciudad: 'Villa María' }
  ],

  // Corrientes (5 feeds)
  corrientes: [
    { name: 'Bella Vista Noticias', url: 'https://bellavistanoticias.com.ar/feed/', category: 'provincial', provincia: 'Corrientes', ciudad: 'Bella Vista' },
    { name: 'Diario El Libertador', url: 'https://www.diarioellibertador.com.ar/feed/', category: 'provincial', provincia: 'Corrientes', ciudad: 'Corrientes Capital' },
    { name: 'El Litoral Policiales', url: 'https://www.ellitoral.com.ar/rss/policiales.xml', category: 'provincial', provincia: 'Corrientes', ciudad: 'Corrientes Capital' },
    { name: 'Radio Curuzú', url: 'https://radiocuruzu.com.ar/feed/', category: 'provincial', provincia: 'Corrientes', ciudad: 'Curuzú Cuatiá' },
    { name: 'Ituzaingó Noticias', url: 'https://ituzaingonoticias.com.ar/feed/', category: 'provincial', provincia: 'Corrientes', ciudad: 'Ituzaingó' }
  ],

  // Entre Ríos (5 feeds)
  entrerios: [
    { name: 'La Calle (Concepción)', url: 'https://www.lacalle.com.ar/feed/', category: 'provincial', provincia: 'Entre Ríos', ciudad: 'Concepción del Uruguay' },
    { name: 'Concordia Hoy', url: 'https://concordiahoy.com.ar/feed/', category: 'provincial', provincia: 'Entre Ríos', ciudad: 'Concordia' },
    { name: 'Federal al Día', url: 'https://federalaldia.com.ar/feed/', category: 'provincial', provincia: 'Entre Ríos', ciudad: 'Federal' },
    { name: 'El Once (Paraná)', url: 'https://www.elonce.com/rss/feed.xml', category: 'provincial', provincia: 'Entre Ríos', ciudad: 'Paraná' },
    { name: 'Paraná Deportes', url: 'https://paranadeportes.com.ar/feed/', category: 'provincial', provincia: 'Entre Ríos', ciudad: 'Paraná' }
  ],

  // Formosa (2 feeds)
  formosa: [
    { name: 'Formosa Hoy', url: 'https://formosahoy.com.ar/feed/', category: 'provincial', provincia: 'Formosa', ciudad: 'Formosa Capital' },
    { name: 'Noticias Formosa', url: 'https://noticiasformosa.com/feed/', category: 'provincial', provincia: 'Formosa', ciudad: 'Formosa Capital' }
  ],

  // Jujuy (3 feeds)
  jujuy: [
    { name: 'Perico Noticias', url: 'https://periconoticias.com.ar/feed/', category: 'provincial', provincia: 'Jujuy', ciudad: 'Perico' },
    { name: 'Jujuy al Día', url: 'https://jujuyaldia.com.ar/feed/', category: 'provincial', provincia: 'Jujuy', ciudad: 'San Salvador de Jujuy' },
    { name: 'Jujuy Noticias', url: 'https://jujuynoticias.com.ar/feed/', category: 'provincial', provincia: 'Jujuy', ciudad: 'San Salvador de Jujuy' }
  ],

  // La Pampa (2 feeds)
  lapampa: [
    { name: 'La Pampa 24', url: 'https://lapampa24.com.ar/feed/', category: 'provincial', provincia: 'La Pampa', ciudad: 'Santa Rosa' },
    { name: 'La Pampa Noticias', url: 'https://lapampanoticias.com.ar/feed/', category: 'provincial', provincia: 'La Pampa', ciudad: 'Santa Rosa' }
  ],

  // La Rioja (4 feeds)
  larioja: [
    { name: 'Rioja 24', url: 'https://rioja24.com.ar/feed/', category: 'provincial', provincia: 'La Rioja', ciudad: 'La Rioja Capital' },
    { name: 'Rioja Política', url: 'https://riojapolitica.com.ar/feed/', category: 'provincial', provincia: 'La Rioja', ciudad: 'La Rioja Capital' },
    { name: 'Rioja Virtual', url: 'https://riojavirtual.com.ar/feed/', category: 'provincial', provincia: 'La Rioja', ciudad: 'La Rioja Capital' },
    { name: 'Noticias del Valle', url: 'https://noticiasdelvalle.com.ar/feed/', category: 'provincial', provincia: 'La Rioja', ciudad: 'Villa Unión' }
  ],

  // Mendoza (5 feeds)
  mendoza: [
    { name: 'Malargüe a Diario', url: 'https://malargueadiario.com/feed/', category: 'provincial', provincia: 'Mendoza', ciudad: 'Malargüe' },
    { name: 'El Sol', url: 'https://www.elsol.com.ar/feed/', category: 'provincial', provincia: 'Mendoza', ciudad: 'Mendoza Capital' },
    { name: 'Noticias Mendoza', url: 'https://noticiasmendoza.com.ar/feed/', category: 'provincial', provincia: 'Mendoza', ciudad: 'Mendoza Capital' },
    { name: 'Diario Mendoza', url: 'https://diariomendoza.com.ar/feed/', category: 'provincial', provincia: 'Mendoza', ciudad: 'San Martín' },
    { name: 'Diario San Rafael', url: 'https://www.diariosanrafael.com.ar/feed/', category: 'provincial', provincia: 'Mendoza', ciudad: 'San Rafael' }
  ],

  // Misiones (6 feeds)
  misiones: [
    { name: 'Eldorado Noticias', url: 'https://eldoradonoticias.com.ar/feed/', category: 'provincial', provincia: 'Misiones', ciudad: 'Eldorado' },
    { name: 'Oberá Noticias', url: 'https://oberanoticias.com.ar/feed/', category: 'provincial', provincia: 'Misiones', ciudad: 'Oberá' },
    { name: 'Oberá Online', url: 'https://oberaonline.com.ar/feed/', category: 'provincial', provincia: 'Misiones', ciudad: 'Oberá' },
    { name: 'Agro Misiones', url: 'https://agromisiones.com.ar/feed/', category: 'provincial', provincia: 'Misiones', ciudad: 'Posadas' },
    { name: 'Misiones Online', url: 'https://misionesonline.net/feed/', category: 'provincial', provincia: 'Misiones', ciudad: 'Posadas' },
    { name: 'Primera Edición', url: 'https://www.primeraedicion.com.ar/feed/', category: 'provincial', provincia: 'Misiones', ciudad: 'Posadas' }
  ],

  // Neuquén (2 feeds)
  neuquen: [
    { name: 'Centenario Digital', url: 'https://centenariodigital.com.ar/feed/', category: 'provincial', provincia: 'Neuquén', ciudad: 'Centenario' },
    { name: 'Cutral Co al Instante', url: 'https://cutralcoalinstante.com/feed/', category: 'provincial', provincia: 'Neuquén', ciudad: 'Cutral Co' }
  ],

  // Río Negro (1 feed)
  rionegro: [
    { name: 'Diario Río Negro', url: 'https://www.rionegro.com.ar/feed/', category: 'provincial', provincia: 'Río Negro', ciudad: 'General Roca' }
  ],

  // Salta (4 feeds)
  salta: [
    { name: 'El Tribuno Salta Deportes', url: 'https://www.eltribuno.com/rss-new/salta/deportes.rss', category: 'provincial', provincia: 'Salta', ciudad: 'Salta Capital' },
    { name: 'El Tribuno Salta Policiales', url: 'https://www.eltribuno.com/rss-new/salta/policiales.rss', category: 'provincial', provincia: 'Salta', ciudad: 'Salta Capital' },
    { name: 'El Tribuno Salta Política', url: 'https://www.eltribuno.com/rss-new/salta/politica.rss', category: 'provincial', provincia: 'Salta', ciudad: 'Salta Capital' },
    { name: 'El Tribuno Salta Portada', url: 'https://www.eltribuno.com/rss-new/salta/portada.rss', category: 'provincial', provincia: 'Salta', ciudad: 'Salta Capital' }
  ],

  // San Juan (2 feeds)
  sanjuan: [
    { name: 'Jáchal Magazine', url: 'https://jachalmagazine.com.ar/feed/', category: 'provincial', provincia: 'San Juan', ciudad: 'Jáchal' },
    { name: 'San Juan Minero', url: 'https://sanjuanminero.com.ar/feed/', category: 'provincial', provincia: 'San Juan', ciudad: 'San Juan Capital' }
  ],

  // San Luis (4 feeds)
  sanluis: [
    { name: 'Agencia San Luis', url: 'https://agenciasanluis.com/feed/', category: 'provincial', provincia: 'San Luis', ciudad: 'San Luis Capital' },
    { name: 'San Luis 24', url: 'https://sanluis24.com.ar/feed/', category: 'provincial', provincia: 'San Luis', ciudad: 'San Luis Capital' },
    { name: 'San Luis Informa', url: 'https://sanluisinforma.com.ar/feed/', category: 'provincial', provincia: 'San Luis', ciudad: 'San Luis Capital' },
    { name: 'Villa Mercedes Hoy', url: 'https://villamercedes.info/feed/', category: 'provincial', provincia: 'San Luis', ciudad: 'Villa Mercedes' }
  ],

  // Santa Cruz (2 feeds)
  santacruz: [
    { name: 'Voces y Apuntes', url: 'https://vocesyapuntes.com/feed/', category: 'provincial', provincia: 'Santa Cruz', ciudad: 'Caleta Olivia' },
    { name: 'Tiempo Sur', url: 'https://tiemposur.com.ar/feed/', category: 'provincial', provincia: 'Santa Cruz', ciudad: 'Río Gallegos' }
  ],

  // Santa Fe (7 feeds)
  santafe: [
    { name: 'Gálvez Hoy', url: 'https://galvezhoy.com.ar/feed/', category: 'provincial', provincia: 'Santa Fe', ciudad: 'Gálvez' },
    { name: 'Radio Amanecer (Reconquista)', url: 'https://radioamanecer.com.ar/feed/', category: 'provincial', provincia: 'Santa Fe', ciudad: 'Reconquista' },
    { name: 'Conclusión (Rosario)', url: 'https://www.conclusion.com.ar/feed/', category: 'provincial', provincia: 'Santa Fe', ciudad: 'Rosario' },
    { name: 'El Ciudadano (Rosario)', url: 'https://www.elciudadanoweb.com/feed/', category: 'provincial', provincia: 'Santa Fe', ciudad: 'Rosario' },
    { name: 'Rosario3', url: 'https://www.rosario3.com/rss/feed.xml', category: 'provincial', provincia: 'Santa Fe', ciudad: 'Rosario' },
    { name: 'SL24 (San Lorenzo)', url: 'https://sl24.com.ar/feed/', category: 'provincial', provincia: 'Santa Fe', ciudad: 'San Lorenzo' },
    { name: 'Venado 24', url: 'https://venado24.com.ar/feed/', category: 'provincial', provincia: 'Santa Fe', ciudad: 'Venado Tuerto' }
  ],

  // Santiago del Estero (1 feed)
  santiago: [
    { name: 'Termas Digital', url: 'https://termasdigital.com.ar/feed/', category: 'provincial', provincia: 'Santiago del Estero', ciudad: 'Termas de Río Hondo' }
  ],

  // Tierra del Fuego (2 feeds)
  tierradelfuego: [
    { name: 'Tiempo Fueguino (Río Grande)', url: 'https://tiempofueguino.com/feed/', category: 'provincial', provincia: 'Tierra del Fuego', ciudad: 'Río Grande' },
    { name: 'El Fueguino (Ushuaia)', url: 'https://elfueguino.com.ar/feed/', category: 'provincial', provincia: 'Tierra del Fuego', ciudad: 'Ushuaia' }
  ],

  // Tucumán (sin feeds verificados actualmente)
  tucuman: []
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
