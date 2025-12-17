const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Servicio de Bing News RSS
 * Bing News incluye imágenes en sus feeds RSS (campo News:Image)
 * Las imágenes son de buena calidad (hasta 700px)
 */

/**
 * Parsear RSS de Bing News
 * @param {string} query - Búsqueda
 * @param {object} options - Opciones
 * @returns {Array} - Noticias con imágenes
 */
const searchBingNews = async (query, options = {}) => {
  const { maxItems = 10, market = 'es-ar' } = options;

  try {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&mkt=${market}`;

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const items = [];

    $('item').each((index, element) => {
      if (index >= maxItems) return false;

      const $item = $(element);
      const title = $item.find('title').text().trim();
      const rawLink = $item.find('link').text().trim();
      const pubDate = $item.find('pubDate').text().trim();
      const description = $item.find('description').text().trim();
      const source = $item.find('News\\:Source').text().trim();

      // Imagen de Bing News (campo personalizado)
      let image = $item.find('News\\:Image').text().trim();

      // Extraer URL real del enlace de redirección de Bing
      let link = rawLink;
      const urlMatch = rawLink.match(/url=([^&]+)/);
      if (urlMatch) {
        link = decodeURIComponent(urlMatch[1]);
      }

      // Mejorar calidad de imagen agregando dimensiones
      if (image && image.includes('bing.com/th')) {
        // Agregar parámetros para mejor calidad
        if (!image.includes('&w=')) {
          image = image + '&w=600&h=400&c=7';
        }
      }

      items.push({
        title: cleanHtmlEntities(title),
        link: link,
        pubDate: pubDate ? new Date(pubDate) : new Date(),
        description: cleanHtmlEntities(description),
        source: source || 'Bing News',
        image: image || null,
        sourceType: 'bing'
      });
    });

    return items;
  } catch (error) {
    console.warn('Error en Bing News:', error.message);
    return [];
  }
};

/**
 * Buscar imagen para un título específico
 * Útil para encontrar imagen cuando Google News no la tiene
 * @param {string} title - Título de la noticia
 * @returns {string|null} - URL de imagen o null
 */
const findImageByTitle = async (title) => {
  try {
    // Buscar en Bing News con el título
    const items = await searchBingNews(title, { maxItems: 5 });

    // Buscar coincidencia por título similar
    for (const item of items) {
      if (item.image) {
        // Verificar similitud del título (al menos 50% de palabras coinciden)
        const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const itemWords = item.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matches = titleWords.filter(w => itemWords.some(iw => iw.includes(w) || w.includes(iw)));

        if (matches.length >= titleWords.length * 0.4) {
          return item.image;
        }
      }
    }

    // Si no hay coincidencia exacta, devolver la primera imagen disponible
    const firstWithImage = items.find(i => i.image);
    return firstWithImage?.image || null;
  } catch (error) {
    console.warn('Error buscando imagen en Bing:', error.message);
    return null;
  }
};

/**
 * Limpiar entidades HTML
 */
const cleanHtmlEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
};

module.exports = {
  searchBingNews,
  findImageByTitle
};
