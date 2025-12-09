/**
 * Generar resumen de un texto
 * Extrae las primeras oraciones más relevantes
 */
const summarize = (text, options = {}) => {
  const { maxSentences = 3, maxLength = 300 } = options;

  if (!text || text.length === 0) {
    return '';
  }

  // Limpiar texto - incluir entidades HTML
  let cleanText = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ') // Otras entidades HTML
    .replace(/<[^>]*>/g, '') // Eliminar tags HTML
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();

  // Dividir en oraciones
  const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];

  // Tomar las primeras oraciones
  let summary = sentences.slice(0, maxSentences).join(' ').trim();

  // Limitar longitud
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength);
    // Cortar en el último espacio para no cortar palabras
    const lastSpace = summary.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      summary = summary.substring(0, lastSpace);
    }
    summary += '...';
  }

  return summary;
};

/**
 * Extraer palabras clave de un texto
 */
const extractKeywords = (text, options = {}) => {
  const { maxKeywords = 5, minLength = 4 } = options;

  if (!text) return [];

  // Palabras comunes a ignorar (stopwords en español)
  const stopwords = new Set([
    'para', 'como', 'pero', 'más', 'este', 'esta', 'esto', 'estos', 'estas',
    'sido', 'siendo', 'será', 'serán', 'sobre', 'también', 'tiene', 'tienen',
    'puede', 'pueden', 'desde', 'hasta', 'entre', 'durante', 'según', 'tras',
    'ante', 'bajo', 'contra', 'hacia', 'mediante', 'porque', 'aunque', 'cuando',
    'donde', 'mientras', 'antes', 'después', 'ahora', 'aquí', 'allí', 'siempre',
    'nunca', 'todavía', 'solo', 'sólo', 'mucho', 'muy', 'poco', 'menos',
    'todos', 'todas', 'algunos', 'algunas', 'otros', 'otras', 'mismo', 'misma',
    'cada', 'cual', 'cuales', 'quien', 'quienes', 'cuyo', 'cuya', 'cuyos',
    'algún', 'ningún', 'ninguno', 'ninguna', 'algo', 'nada', 'nadie', 'cualquier',
    'los', 'las', 'del', 'una', 'unos', 'unas', 'con', 'por', 'sin', 'que'
  ]);

  // Extraer palabras
  const words = text.toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= minLength && !stopwords.has(word));

  // Contar frecuencia
  const wordCount = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
  }

  // Ordenar por frecuencia y tomar las más comunes
  const sortedWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);

  return sortedWords;
};

/**
 * Calcular tiempo de lectura estimado
 */
const calculateReadingTime = (text, wordsPerMinute = 200) => {
  if (!text) return 0;

  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  return minutes;
};

/**
 * Generar lead/entradilla periodística
 * Extrae las primeras 2 oraciones y las formatea
 */
const generateLead = (title, description) => {
  const text = description || '';

  // Obtener primera oración del contenido
  const firstSentence = text.match(/^[^.!?]+[.!?]/)?.[0] || text.substring(0, 150);

  return firstSentence.trim();
};

/**
 * Formatear noticia para publicación en redes
 */
const formatForSocialMedia = (news, options = {}) => {
  const {
    platform = 'general',
    includeEmojis = true,
    includeSource = true,
    includeImage = false
  } = options;

  let formatted = '';

  // Agregar tema/categoría con emoji
  if (news.category && includeEmojis) {
    const categoryEmojis = {
      politica: '🏛️',
      economia: '💰',
      deportes: '⚽',
      espectaculos: '🎬',
      tecnologia: '💻',
      general: '📰'
    };
    const emoji = categoryEmojis[news.category] || '📰';
    formatted += `${emoji} ${news.category.toUpperCase()}\n\n`;
  }

  // Titular
  formatted += `📰 ${news.title}\n\n`;

  // Resumen
  if (news.description) {
    const summary = summarize(news.description, { maxSentences: 2, maxLength: 200 });
    formatted += `📄 ${summary}\n\n`;
  }

  // Emojis generados
  if (news.emojis && includeEmojis) {
    formatted += `🎯 ${Array.isArray(news.emojis) ? news.emojis.join(' ') : news.emojis}\n\n`;
  }

  // Enlace
  formatted += `🔗 ${news.shortUrl || news.link}\n`;

  // Fuente
  if (news.source && includeSource) {
    formatted += `\n📺 Fuente: ${news.source}`;
  }

  // Imagen (solo indicar URL)
  if (news.image && includeImage) {
    formatted += `\n\n🖼️ ${news.image}`;
  }

  return formatted.trim();
};

/**
 * Formatear múltiples noticias como lista
 */
const formatNewsList = (newsList, options = {}) => {
  const { separator = '\n\n---\n\n', numbered = false } = options;

  return newsList
    .map((news, index) => {
      const formatted = formatForSocialMedia(news, options);
      return numbered ? `${index + 1}. ${formatted}` : formatted;
    })
    .join(separator);
};

module.exports = {
  summarize,
  extractKeywords,
  calculateReadingTime,
  generateLead,
  formatForSocialMedia,
  formatNewsList
};
