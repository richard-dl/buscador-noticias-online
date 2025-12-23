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
  estrenos: ['🎬', '📺', '🍿', '🎥', '✨'],
  tecnologia: ['💻', '📱', '🤖', '🔬', '💡'],
  policiales: ['🚔', '⚠️', '🚨', '🔍', '📋'],
  investigacion: ['🔍', '🔬', '📋', '🕵️', '⚖️'],
  accidentes: ['🚗', '⚠️', '🚨', '🚑', '🔴'],
  naturaleza: ['🌪️', '⚠️', '🌊', '🔥', '🌋'],
  judiciales: ['⚖️', '🔨', '👨‍⚖️', '📋', '🏛️'],
  salud: ['🏥', '💊', '🩺', '❤️', '🧬'],
  educacion: ['📚', '🎓', '✏️', '🏫', '📖'],
  cultura: ['🎨', '🎵', '📚', '🎭', '🖼️'],
  ciencia: ['🔬', '🧪', '🔭', '⚗️', '🧬'],
  medioambiente: ['🌍', '🌱', '♻️', '🌳', '🌊'],
  internacionales: ['🌍', '🌐', '✈️', '🗺️', '🏳️'],
  internacional: ['🌍', '🌐', '✈️', '🗺️', '🏳️'],
  clima: ['🌤️', '🌧️', '❄️', '🌡️', '⛈️'],

  // Categorías adicionales
  turismo: ['✈️', '🏖️', '🗺️', '🧳', '🏨'],
  juegos: ['🎰', '🎲', '🍀', '💵', '🎯'],
  agro: ['🌾', '🚜', '🐄', '🌱', '🌻'],
  empresas: ['🏢', '💼', '📊', '🤝', '💹'],
  emprendimientos: ['🚀', '💡', '📈', '🎯', '✨'],
  vida_sana: ['🏃', '🥗', '💪', '🧘', '🥦'],
  gastronomia: ['🍽️', '👨‍🍳', '🍷', '🥘', '🍴'],
  paranormal: ['👻', '🛸', '✨', '🔮', '👁️'],
  filosofia: ['🤔', '💭', '📖', '🧠', '✨'],
  mineria: ['⛏️', '💎', '🏔️', '🪨', '⚙️'],
  sociedad: ['👥', '🏘️', '🤝', '📢', '🌆'],

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
  'vacuna': '💉',
  'pandemia': '😷',
  'covid': '🦠',

  // Accidentes
  'accidente': '🚗',
  'choque': '💥',
  'volcó': '🔄',
  'vuelco': '🔄',
  'atropellado': '🚶',
  'siniestro vial': '🚗',
  'heridos': '🚑',
  'víctimas fatales': '⚫',
  'ruta': '🛣️',
  'autopista': '🛣️',
  'motociclista': '🏍️',
  'ambulancia': '🚑',

  // Naturaleza/Catástrofes
  'temporal': '🌪️',
  'inundación': '🌊',
  'inundaciones': '🌊',
  'evacuados': '🏃',
  'terremoto': '🌋',
  'sismo': '🌋',
  'huracán': '🌀',
  'ciclón': '🌀',
  'tornado': '🌪️',
  'incendio': '🔥',
  'incendio forestal': '🔥',
  'sequía': '☀️',
  'granizo': '🧊',
  'alud': '🏔️',
  'tsunami': '🌊',
  'volcán': '🌋',
  'erupción': '🌋',
  'derrumbe': '🏚️',
  'alerta meteorológica': '⚠️',
  'desastre natural': '🆘',

  // Estrenos
  'estreno': '🎬',
  'netflix': '📺',
  'temporada': '📺',
  'nueva temporada': '🆕',
  'volumen 2': '📺',
  'disney+': '🏰',
  'amazon prime': '📦',
  'premiere': '🎬',
  'trailer': '🎥',

  // Investigación
  'sospechoso': '🔍',
  'investigado': '🔬',
  'autopsia': '🔬',
  'forense': '🔬',
  'peritaje': '📋',
  'indagatoria': '📋',
  'testigo': '👁️',
  'prisión preventiva': '⛓️',

  // Argentina
  'argentina': '🇦🇷',
  'buenos aires': '🏙️',
  'córdoba': '🏔️',
  'mendoza': '🍇',
  'patagonia': '🏔️❄️',

  // Turismo
  'viaje': '✈️',
  'vacaciones': '🏖️',
  'hotel': '🏨',
  'turista': '🧳',
  'escapada': '🗺️',

  // Juegos/Azar
  'lotería': '🎰',
  'quiniela': '🎲',
  'sorteo': '🍀',
  'ganador': '🏆',

  // Agro
  'cosecha': '🌾',
  'campo': '🚜',
  'soja': '🌱',
  'trigo': '🌾',
  'ganadería': '🐄',

  // Empresas
  'empresa': '🏢',
  'corporación': '💼',
  'negocio': '📊',

  // Gastronomía
  'cocina': '🍽️',
  'chef': '👨‍🍳',
  'restaurante': '🍴',
  'receta': '🥘',

  // Vida sana
  'fitness': '💪',
  'dieta': '🥗',
  'gimnasio': '🏃',
  'yoga': '🧘',

  // Paranormal
  'ovni': '🛸',
  'fantasma': '👻',
  'milagro': '✨',

  // Minería
  'litio': '⛏️',
  'mina': '💎',
  'minería': '🏔️',

  // Judiciales
  'juez': '👨‍⚖️',
  'tribunal': '⚖️',
  'fiscal': '⚖️',
  'sentencia': '🔨',

  // Construcción/Inmobiliario
  'construcción': '🏗️',
  'casa': '🏠',
  'departamento': '🏢',
  'inmueble': '🏘️',
  'metro cuadrado': '📐',
  'propiedad': '🏠'
};

/**
 * Detectar categoría de un texto
 */
const detectCategory = (text) => {
  const lowerText = text.toLowerCase();

  const categoryKeywords = {
    // Las categorías más específicas primero para priorizar
    estrenos: ['estreno', 'estrena', 'nueva temporada', 'netflix', 'disney+', 'amazon prime', 'volumen 2', 'parte 2', 'temporada 5', 'premiere', 'plataforma'],
    accidentes: ['accidente', 'choque', 'volcó', 'vuelco', 'colisión', 'siniestro vial', 'atropellado', 'atropello', 'despiste', 'tragedia vial', 'víctimas fatales', 'ambulancia', 'rescate'],
    naturaleza: ['temporal', 'inundación', 'inundaciones', 'terremoto', 'sismo', 'huracán', 'ciclón', 'tornado', 'evacuados', 'alerta meteorológica', 'desastre natural', 'incendio forestal', 'alud', 'tsunami', 'granizo', 'derrumbe', 'volcán'],
    investigacion: ['sospechoso', 'investigado', 'indagatoria', 'peritaje', 'autopsia', 'forense', 'escena del crimen', 'prisión preventiva', 'presunto', 'presunta'],
    // Categorías generales
    politica: ['gobierno', 'presidente', 'ministro', 'congreso', 'diputado', 'senador', 'ley', 'decreto'],
    economia: ['dólar', 'peso', 'inflación', 'banco', 'economía', 'mercado', 'impuesto', 'inversión', 'salario', 'paritarias', 'tarifas'],
    deportes: ['fútbol', 'partido', 'gol', 'campeonato', 'selección', 'liga', 'equipo', 'jugador', 'básquet', 'tenis'],
    espectaculos: ['actor', 'actriz', 'película', 'serie', 'televisión', 'música', 'concierto', 'famoso', 'farándula', 'horóscopo', 'zodíaco', 'gran hermano', 'reality'],
    tecnologia: ['tecnología', 'app', 'celular', 'internet', 'software', 'inteligencia artificial', 'startup', 'whatsapp', 'iphone', 'android'],
    policiales: ['policía', 'robo', 'crimen', 'asesinato', 'detenido', 'narcotráfico', 'homicidio', 'femicidio', 'tiroteo', 'baleado'],
    judiciales: ['tribunal', 'juez', 'fiscal', 'sentencia', 'causa judicial', 'imputado', 'procesado', 'condena', 'fallo'],
    salud: ['salud', 'hospital', 'médico', 'vacuna', 'enfermedad', 'tratamiento', 'medicina'],
    internacional: ['eeuu', 'estados unidos', 'brasil', 'chile', 'europa', 'china', 'rusia', 'trump', 'biden', 'ucrania', 'putin', 'gaza', 'israel'],
    turismo: ['viaje', 'vacaciones', 'hotel', 'turismo', 'destino', 'playa', 'escapada', 'feriado'],
    juegos: ['lotería', 'quiniela', 'sorteo', 'loto', 'números ganadores', 'azar'],
    agro: ['campo', 'agricultura', 'ganadería', 'cosecha', 'soja', 'trigo', 'agroindustria'],
    empresas: ['empresa', 'corporación', 'negocio', 'fusión', 'adquisición', 'compañía'],
    emprendimientos: ['emprendedor', 'startup', 'pyme', 'incubadora', 'inversores'],
    vida_sana: ['dieta', 'ejercicio', 'fitness', 'nutrición', 'wellness', 'yoga', 'gimnasio'],
    gastronomia: ['cocina', 'receta', 'restaurante', 'chef', 'gastronomía', 'plato', 'vino'],
    paranormal: ['ovni', 'fantasma', 'milagro', 'sobrenatural', 'paranormal', 'avistamiento'],
    filosofia: ['filosofía', 'reflexión', 'existencial', 'parábola', 'enseñanza', 'propósito'],
    mineria: ['minería', 'mina', 'litio', 'minerales', 'yacimiento', 'extracción'],
    sociedad: ['sociedad', 'comunidad', 'vecinos', 'barrio', 'ciudadanos']
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

  const lowerText = (text || '').toLowerCase();
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
    // Normalizar categoría a minúsculas
    const normalizedCategory = category ? category.toLowerCase() : null;
    const detectedCategory = normalizedCategory || detectCategory(text || '');
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
