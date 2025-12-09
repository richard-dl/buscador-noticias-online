const axios = require('axios');

// Cache simple en memoria para traducciones
const translationCache = new Map();
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

/**
 * Limpiar cache viejo
 */
const cleanCache = () => {
  const now = Date.now();
  for (const [key, value] of translationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      translationCache.delete(key);
    }
  }
};

/**
 * Generar clave de cache
 */
const getCacheKey = (text, from, to) => {
  return `${from}:${to}:${text.substring(0, 100)}`;
};

/**
 * Traducir texto usando Google Translate (API gratuita no oficial)
 */
const translateWithGoogle = async (text, from = 'en', to = 'es') => {
  try {
    // Verificar cache
    const cacheKey = getCacheKey(text, from, to);
    if (translationCache.has(cacheKey)) {
      const cached = translationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.translation;
      }
    }

    // API gratuita de Google Translate
    const url = 'https://translate.googleapis.com/translate_a/single';

    const response = await axios.get(url, {
      params: {
        client: 'gtx',
        sl: from,
        tl: to,
        dt: 't',
        q: text
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Extraer traducción del resultado
    let translation = '';
    if (response.data && response.data[0]) {
      translation = response.data[0]
        .filter(item => item && item[0])
        .map(item => item[0])
        .join('');
    }

    // Guardar en cache
    if (translation) {
      if (translationCache.size >= CACHE_MAX_SIZE) {
        cleanCache();
      }
      translationCache.set(cacheKey, {
        translation,
        timestamp: Date.now()
      });
    }

    return translation || text;
  } catch (error) {
    console.error('Error en traducción:', error.message);
    return text; // Devolver texto original si falla
  }
};

/**
 * Detectar idioma del texto
 */
const detectLanguage = async (text) => {
  try {
    const url = 'https://translate.googleapis.com/translate_a/single';

    const response = await axios.get(url, {
      params: {
        client: 'gtx',
        sl: 'auto',
        tl: 'es',
        dt: 't',
        q: text.substring(0, 200)
      },
      timeout: 5000
    });

    // El idioma detectado está en response.data[2]
    if (response.data && response.data[2]) {
      return response.data[2];
    }

    return 'unknown';
  } catch (error) {
    console.error('Error detectando idioma:', error.message);
    return 'unknown';
  }
};

/**
 * Traducir solo si está en inglés
 */
const translateIfEnglish = async (text) => {
  if (!text || text.length < 10) {
    return text;
  }

  // Detectar idioma
  const lang = await detectLanguage(text);

  // Si está en español, no traducir
  if (lang === 'es') {
    return text;
  }

  // Si está en inglés (o no detectado), traducir
  return translateWithGoogle(text, lang === 'unknown' ? 'auto' : lang, 'es');
};

/**
 * Traducir múltiples textos en lote
 */
const translateBatch = async (texts, from = 'en', to = 'es') => {
  const translations = await Promise.all(
    texts.map(text => translateWithGoogle(text, from, to))
  );
  return translations;
};

/**
 * Traducir noticia completa (título y descripción)
 */
const translateNews = async (news) => {
  try {
    // Solo traducir si parece estar en inglés
    const titleLang = await detectLanguage(news.title);

    if (titleLang === 'es') {
      return news; // Ya está en español
    }

    const [translatedTitle, translatedDescription] = await Promise.all([
      translateWithGoogle(news.title, 'auto', 'es'),
      news.description ? translateWithGoogle(news.description, 'auto', 'es') : Promise.resolve('')
    ]);

    return {
      ...news,
      title: translatedTitle,
      description: translatedDescription,
      originalTitle: news.title,
      originalDescription: news.description,
      translated: true
    };
  } catch (error) {
    console.error('Error traduciendo noticia:', error.message);
    return { ...news, translated: false };
  }
};

/**
 * Obtener estadísticas del cache
 */
const getCacheStats = () => {
  return {
    size: translationCache.size,
    maxSize: CACHE_MAX_SIZE
  };
};

/**
 * Limpiar todo el cache
 */
const clearCache = () => {
  translationCache.clear();
};

module.exports = {
  translateWithGoogle,
  detectLanguage,
  translateIfEnglish,
  translateBatch,
  translateNews,
  getCacheStats,
  clearCache
};
