/**
 * Mapeo de categorías/temas a emojis
 */
const CATEGORY_EMOJIS = {
  // Temáticas principales
  politica: ['🏛️', '⚖️', '🗳️', '📜', '👔'],
  economia: ['💰', '📈', '💵', '🏦', '📊'],
  deportes: ['⚽', '🏆', '🥇', '🏅', '🎯'],
  futbol: ['⚽', '🥅', '🏟️', '🏆', '⚡'],
  espectaculos: ['🎬', '🎭', '⭐', '🎤', '📺'],
  tecnologia: ['💻', '📱', '🤖', '🔬', '💡'],
  policiales: ['🚔', '⚠️', '🚨', '🔍', '📋'],
  salud: ['🏥', '💊', '🩺', '❤️', '🧬'],
  educacion: ['📚', '🎓', '✏️', '🏫', '📖'],
  cultura: ['🎨', '🎵', '📚', '🎭', '🖼️'],
  ciencia: ['🔬', '🧪', '🔭', '⚗️', '🧬'],
  medioambiente: ['🌍', '🌱', '♻️', '🌳', '🌊'],
  internacionales: ['🌍', '🌐', '✈️', '🗺️', '🏳️'],
  clima: ['🌤️', '🌧️', '❄️', '🌡️', '⛈️'],
  general: ['📰', '📢', '🗞️', '📣', '💬'],

  // Emociones/situaciones
  urgente: ['🚨', '⚡', '‼️', '🔴', '⏰'],
  positivo: ['✅', '👍', '🎉', '💪', '🌟'],
  negativo: ['❌', '😔', '⚠️', '📉', '💔'],
  alerta: ['⚠️', '🔔', '📢', '❗', '🚫'],
  nuevo: ['🆕', '✨', '🔥', '💫', '🌟'],
  exclusivo: ['🔒', '💎', '⭐', '🏆', '👑']
};

/**
 * Palabras clave y sus emojis asociados
 */
const KEYWORD_EMOJIS = {
  // Economía
  'dólar': '💵',
  'peso': '💲',
  'inflación': '📈',
  'devaluación': '📉',
  'banco': '🏦',
  'inversión': '💹',
  'mercado': '📊',
  'impuesto': '💸',
  'sueldo': '💰',
  'salario': '💵',

  // Política
  'presidente': '🏛️',
  'gobierno': '🏛️',
  'congreso': '🏛️',
  'ministro': '👔',
  'elecciones': '🗳️',
  'ley': '📜',
  'decreto': '📋',
  'votación': '✋',

  // Deportes
  'gol': '⚽',
  'partido': '🏟️',
  'campeonato': '🏆',
  'selección': '🇦🇷',
  'messi': '🐐',
  'boca': '💙💛',
  'river': '❤️🤍',
  'mundial': '🏆',
  'liga': '⚽',

  // Tecnología
  'app': '📱',
  'celular': '📱',
  'internet': '🌐',
  'hacker': '👨‍💻',
  'ciberseguridad': '🔒',
  'inteligencia artificial': '🤖',
  'robot': '🤖',

  // Clima
  'lluvia': '🌧️',
  'tormenta': '⛈️',
  'calor': '☀️',
  'frío': '❄️',
  'alerta meteorológica': '⚠️🌧️',

  // General
  'muere': '⚫',
  'fallece': '⚫',
  'nace': '👶',
  'casamiento': '💒',
  'boda': '💍',
  'accidente': '🚨',
  'incendio': '🔥',
  'terremoto': '🌋',
  'vacuna': '💉',
  'pandemia': '😷',
  'covid': '🦠',

  // Argentina
  'argentina': '🇦🇷',
  'buenos aires': '🏙️',
  'córdoba': '🏔️',
  'mendoza': '🍇',
  'patagonia': '🏔️❄️'
};

/**
 * Detectar categoría de un texto
 */
const detectCategory = (text) => {
  const lowerText = text.toLowerCase();

  const categoryKeywords = {
    politica: ['gobierno', 'presidente', 'ministro', 'congreso', 'diputado', 'senador', 'ley', 'decreto'],
    economia: ['dólar', 'peso', 'inflación', 'banco', 'economía', 'mercado', 'impuesto', 'inversión'],
    deportes: ['fútbol', 'partido', 'gol', 'campeonato', 'selección', 'liga', 'equipo', 'jugador'],
    espectaculos: ['actor', 'actriz', 'película', 'serie', 'televisión', 'música', 'concierto', 'famoso'],
    tecnologia: ['tecnología', 'app', 'celular', 'internet', 'software', 'inteligencia artificial'],
    policiales: ['policía', 'robo', 'crimen', 'asesinato', 'detenido', 'investigación', 'justicia'],
    salud: ['salud', 'hospital', 'médico', 'vacuna', 'enfermedad', 'tratamiento'],
    internacionales: ['eeuu', 'estados unidos', 'brasil', 'chile', 'europa', 'china', 'rusia']
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return category;
    }
  }

  return 'general';
};

/**
 * Generar emojis para un texto
 */
const generateEmojis = (text, options = {}) => {
  const { maxEmojis = 3, category = null } = options;

  const lowerText = text.toLowerCase();
  const emojis = new Set();

  // 1. Buscar keywords específicas
  for (const [keyword, emoji] of Object.entries(KEYWORD_EMOJIS)) {
    if (lowerText.includes(keyword)) {
      emojis.add(emoji);
      if (emojis.size >= maxEmojis) break;
    }
  }

  // 2. Si no hay suficientes, usar emojis de categoría
  if (emojis.size < maxEmojis) {
    const detectedCategory = category || detectCategory(text);
    const categoryEmojis = CATEGORY_EMOJIS[detectedCategory] || CATEGORY_EMOJIS.general;

    for (const emoji of categoryEmojis) {
      emojis.add(emoji);
      if (emojis.size >= maxEmojis) break;
    }
  }

  return Array.from(emojis).slice(0, maxEmojis);
};

/**
 * Generar emojis para una noticia completa
 */
const generateNewsEmojis = (news, options = {}) => {
  const text = `${news.title || ''} ${news.description || ''}`;
  const category = news.category || null;

  return generateEmojis(text, { ...options, category });
};

/**
 * Formatear emojis como string
 */
const emojisToString = (emojis, separator = ' ') => {
  return emojis.join(separator);
};

/**
 * Obtener emoji de categoría principal
 */
const getCategoryEmoji = (category) => {
  const emojis = CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS.general;
  return emojis[0];
};

module.exports = {
  generateEmojis,
  generateNewsEmojis,
  detectCategory,
  getCategoryEmoji,
  emojisToString,
  CATEGORY_EMOJIS,
  KEYWORD_EMOJIS
};
