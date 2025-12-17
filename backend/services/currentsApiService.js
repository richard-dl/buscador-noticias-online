const axios = require('axios');

/**
 * Servicio de Currents API
 * API de noticias con 600 req/día gratis
 * Incluye imágenes de alta calidad y soporte para Argentina
 * https://currentsapi.services/
 */

const API_KEY = process.env.CURRENTS_API_KEY;
const BASE_URL = 'https://api.currentsapi.services/v1';

/**
 * Obtener noticias recientes
 * @param {object} options - Opciones de búsqueda
 * @returns {Array} - Noticias con imágenes
 */
const getLatestNews = async (options = {}) => {
  const {
    language = 'es',
    country = 'AR',
    category = null,
    maxItems = 30
  } = options;

  if (!API_KEY) {
    console.warn('CURRENTS_API_KEY no configurada');
    return [];
  }

  try {
    const params = {
      apiKey: API_KEY,
      language,
      country
    };

    if (category) {
      params.category = category;
    }

    const response = await axios.get(`${BASE_URL}/latest-news`, {
      params,
      timeout: 15000
    });

    if (response.data.status !== 'ok' || !response.data.news) {
      return [];
    }

    return response.data.news.slice(0, maxItems).map(normalizeArticle);
  } catch (error) {
    console.warn('Error en Currents API (latest):', error.message);
    return [];
  }
};

/**
 * Buscar noticias por palabras clave
 * @param {string} keywords - Palabras clave
 * @param {object} options - Opciones de búsqueda
 * @returns {Array} - Noticias encontradas
 */
const searchNews = async (keywords, options = {}) => {
  const {
    language = 'es',
    country = null,
    category = null,
    maxItems = 30,
    startDate = null,
    endDate = null
  } = options;

  if (!API_KEY) {
    console.warn('CURRENTS_API_KEY no configurada');
    return [];
  }

  try {
    const params = {
      apiKey: API_KEY,
      keywords,
      language
    };

    if (country) params.country = country;
    if (category) params.category = category;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await axios.get(`${BASE_URL}/search`, {
      params,
      timeout: 20000
    });

    if (response.data.status !== 'ok' || !response.data.news) {
      return [];
    }

    return response.data.news.slice(0, maxItems).map(normalizeArticle);
  } catch (error) {
    console.warn('Error en Currents API (search):', error.message);
    return [];
  }
};

/**
 * Buscar imagen por título de noticia
 * Útil como fallback cuando otras fuentes no tienen imagen
 * @param {string} title - Título de la noticia
 * @returns {string|null} - URL de imagen o null
 */
const findImageByTitle = async (title) => {
  if (!API_KEY || !title) {
    return null;
  }

  try {
    // Extraer palabras clave del título (primeras 5-6 palabras significativas)
    const keywords = title
      .replace(/[^\w\sáéíóúñü]/gi, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5)
      .join(' ');

    if (!keywords) return null;

    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        apiKey: API_KEY,
        keywords,
        language: 'es',
        page_size: 5
      },
      timeout: 10000
    });

    if (response.data.status !== 'ok' || !response.data.news) {
      return null;
    }

    // Buscar artículo con imagen que tenga título similar
    for (const article of response.data.news) {
      if (article.image && article.image !== 'None') {
        // Verificar similitud básica
        const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const articleWords = article.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matches = titleWords.filter(w => articleWords.some(aw => aw.includes(w) || w.includes(aw)));

        if (matches.length >= titleWords.length * 0.3) {
          return article.image;
        }
      }
    }

    // Si no hay coincidencia exacta, devolver primera imagen disponible
    const withImage = response.data.news.find(a => a.image && a.image !== 'None');
    return withImage?.image || null;
  } catch (error) {
    console.warn('Error buscando imagen en Currents:', error.message);
    return null;
  }
};

/**
 * Normalizar artículo al formato del proyecto
 */
const normalizeArticle = (article) => {
  return {
    title: cleanText(article.title),
    link: article.url,
    pubDate: article.published ? new Date(article.published) : new Date(),
    description: cleanText(article.description),
    source: article.author || 'Currents API',
    image: article.image && article.image !== 'None' ? article.image : null,
    category: Array.isArray(article.category) ? article.category[0] : article.category,
    sourceType: 'currents'
  };
};

/**
 * Limpiar texto de entidades HTML
 */
const cleanText = (text) => {
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

/**
 * Verificar si la API está configurada
 */
const isConfigured = () => {
  return !!API_KEY;
};

module.exports = {
  getLatestNews,
  searchNews,
  findImageByTitle,
  isConfigured
};
