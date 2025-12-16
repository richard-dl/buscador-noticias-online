/**
 * Servicio para integración con Bot de Telegram
 * Procesa mensajes del grupo VIP y extrae contenido con hashtags
 */

const { saveVipContent } = require('./firebaseService');

/**
 * Hashtags soportados:
 * #titulo - Título de la noticia/contenido
 * #fuente - Fuente de la información
 * #sensible - Datos sensibles (se mostrarán entre corchetes)
 */

/**
 * Parsear mensaje de Telegram y extraer datos por hashtags
 */
const parseMessageWithHashtags = (text) => {
  const result = {
    titulo: '',
    fuente: '',
    sensible: [],
    contenido: ''
  };

  if (!text) return result;

  // Extraer #titulo
  const tituloMatch = text.match(/#titulo\s+([^\n#]+)/i);
  if (tituloMatch) {
    result.titulo = tituloMatch[1].trim();
  }

  // Extraer #fuente
  const fuenteMatch = text.match(/#fuente\s+([^\n#]+)/i);
  if (fuenteMatch) {
    result.fuente = fuenteMatch[1].trim();
  }

  // Extraer todos los #sensible
  const sensibleMatches = text.matchAll(/#sensible\s+([^\n#]+)/gi);
  for (const match of sensibleMatches) {
    result.sensible.push(match[1].trim());
  }

  // El contenido es todo el texto limpio de hashtags
  let contenido = text
    .replace(/#titulo\s+[^\n#]+/gi, '')
    .replace(/#fuente\s+[^\n#]+/gi, '')
    .replace(/#sensible\s+[^\n#]+/gi, '')
    .trim();

  // Reemplazar datos sensibles por [DATO SENSIBLE]
  for (const dato of result.sensible) {
    contenido = contenido.replace(new RegExp(escapeRegExp(dato), 'gi'), `[${dato}]`);
  }

  result.contenido = contenido;

  return result;
};

/**
 * Escapar caracteres especiales para regex
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Detectar datos potencialmente sensibles en el texto
 * (números de teléfono, emails, DNI, direcciones, etc.)
 */
const detectSensitiveData = (text) => {
  const sensiblePatterns = [
    { type: 'telefono', pattern: /\b\d{2,4}[-\s]?\d{4}[-\s]?\d{4}\b/g },
    { type: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
    { type: 'dni', pattern: /\b\d{7,8}\b/g },
    { type: 'direccion', pattern: /\b(calle|av\.|avenida|pasaje)\s+[a-záéíóú\s]+\d+/gi },
    { type: 'cuil', pattern: /\b\d{2}-\d{7,8}-\d{1}\b/g }
  ];

  const detected = [];

  for (const { type, pattern } of sensiblePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      detected.push(...matches.map(m => ({ type, value: m })));
    }
  }

  return detected;
};

/**
 * Procesar mensaje de Telegram (texto)
 */
const processTextMessage = async (message) => {
  const text = message.text || message.caption || '';
  const parsed = parseMessageWithHashtags(text);

  // Auto-detectar datos sensibles adicionales
  const autoDetected = detectSensitiveData(text);
  const autoSensible = autoDetected.map(d => d.value);

  // Combinar sensibles manuales y auto-detectados
  parsed.sensible = [...new Set([...parsed.sensible, ...autoSensible])];

  // Volver a procesar contenido con todos los sensibles
  let contenido = text
    .replace(/#titulo\s+[^\n#]+/gi, '')
    .replace(/#fuente\s+[^\n#]+/gi, '')
    .replace(/#sensible\s+[^\n#]+/gi, '')
    .trim();

  for (const dato of parsed.sensible) {
    contenido = contenido.replace(new RegExp(escapeRegExp(dato), 'gi'), `[DATO SENSIBLE]`);
  }
  parsed.contenido = contenido;

  return {
    ...parsed,
    telegramMessageId: message.message_id,
    chatId: message.chat?.id
  };
};

/**
 * Procesar mensaje de Telegram con foto
 */
const processPhotoMessage = async (message) => {
  const parsed = await processTextMessage(message);

  // Obtener la foto de mayor resolución
  const photos = message.photo || [];
  const largestPhoto = photos[photos.length - 1];

  return {
    ...parsed,
    imagen: largestPhoto ? {
      fileId: largestPhoto.file_id,
      width: largestPhoto.width,
      height: largestPhoto.height
    } : null
  };
};

/**
 * Procesar update de Telegram (webhook)
 */
const processTelegramUpdate = async (update) => {
  const message = update.message || update.channel_post;

  if (!message) {
    return { processed: false, reason: 'No message in update' };
  }

  // Verificar que viene del grupo autorizado
  const authorizedChatId = process.env.TELEGRAM_GROUP_ID;
  if (authorizedChatId && String(message.chat?.id) !== String(authorizedChatId)) {
    return { processed: false, reason: 'Unauthorized chat' };
  }

  let contentData;

  if (message.photo) {
    contentData = await processPhotoMessage(message);
  } else if (message.text || message.caption) {
    contentData = await processTextMessage(message);
  } else {
    return { processed: false, reason: 'Unsupported message type' };
  }

  // Solo guardar si tiene título o contenido
  if (!contentData.titulo && !contentData.contenido) {
    return { processed: false, reason: 'No content to save' };
  }

  // Guardar en Firestore
  const saved = await saveVipContent(contentData);

  return {
    processed: true,
    contentId: saved.id,
    data: contentData
  };
};

/**
 * Verificar token del webhook de Telegram
 */
const verifyWebhookToken = (token) => {
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  return token === expectedToken;
};

module.exports = {
  parseMessageWithHashtags,
  detectSensitiveData,
  processTextMessage,
  processPhotoMessage,
  processTelegramUpdate,
  verifyWebhookToken
};
