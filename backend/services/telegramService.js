/**
 * Servicio para integración con Bot de Telegram
 * Procesa mensajes del grupo VIP y extrae contenido con hashtags
 */

const { saveVipContent } = require('./firebaseService');
const axios = require('axios');

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_FILE_URL = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}`;

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
  console.log('[Webhook] ====== NUEVO UPDATE ======');
  console.log('[Webhook] Update ID:', update.update_id);
  console.log('[Webhook] Tipo de update:',
    update.message ? 'message' :
    update.channel_post ? 'channel_post' :
    update.edited_message ? 'edited_message' :
    update.edited_channel_post ? 'edited_channel_post' : 'otro'
  );
  console.log('[Webhook] Update completo:', JSON.stringify(update, null, 2));

  const message = update.message || update.channel_post;

  if (!message) {
    console.log('[Webhook] No hay mensaje en el update');
    return { processed: false, reason: 'No message in update' };
  }

  console.log('[Webhook] Mensaje recibido:', {
    chat_id: message.chat?.id,
    has_photo: !!message.photo,
    has_text: !!message.text,
    has_caption: !!message.caption,
    photo_count: message.photo?.length || 0
  });

  // Verificar que viene del grupo autorizado
  const authorizedChatId = process.env.TELEGRAM_GROUP_ID;
  console.log('[Webhook] Chat autorizado:', authorizedChatId, '| Chat actual:', message.chat?.id);

  if (authorizedChatId && String(message.chat?.id) !== String(authorizedChatId)) {
    console.log('[Webhook] Chat no autorizado');
    return { processed: false, reason: 'Unauthorized chat' };
  }

  let contentData;

  if (message.photo) {
    console.log('[Webhook] Procesando mensaje con FOTO');
    contentData = await processPhotoMessage(message);
    console.log('[Webhook] Datos de foto procesados:', JSON.stringify(contentData, null, 2));
  } else if (message.text || message.caption) {
    console.log('[Webhook] Procesando mensaje de TEXTO');
    contentData = await processTextMessage(message);
  } else {
    console.log('[Webhook] Tipo de mensaje no soportado');
    return { processed: false, reason: 'Unsupported message type' };
  }

  // Solo guardar si tiene título, contenido o imagen
  if (!contentData.titulo && !contentData.contenido && !contentData.imagen) {
    console.log('[Webhook] No hay contenido para guardar');
    return { processed: false, reason: 'No content to save' };
  }

  console.log('[Webhook] Guardando contenido en Firestore...');

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

/**
 * Obtener información del archivo desde Telegram
 * @param {string} fileId - ID del archivo en Telegram
 * @returns {Promise<{file_path: string, file_size: number}>}
 */
const getFileInfo = async (fileId) => {
  try {
    const url = `${TELEGRAM_API_URL}/getFile`;
    console.log('[Telegram] Llamando getFile:', url.replace(process.env.TELEGRAM_BOT_TOKEN, 'BOT_TOKEN'));
    console.log('[Telegram] fileId:', fileId);

    const response = await axios.get(url, {
      params: { file_id: fileId }
    });

    console.log('[Telegram] Respuesta getFile:', JSON.stringify(response.data));

    if (response.data.ok) {
      return response.data.result;
    }
    throw new Error('No se pudo obtener información del archivo: ' + JSON.stringify(response.data));
  } catch (error) {
    console.error('[Telegram] Error obteniendo info del archivo:', error.message);
    if (error.response) {
      console.error('[Telegram] Response data:', JSON.stringify(error.response.data));
    }
    throw error;
  }
};

/**
 * Descargar archivo de Telegram como stream/buffer
 * @param {string} fileId - ID del archivo en Telegram
 * @returns {Promise<{data: Buffer, contentType: string}>}
 */
const downloadFile = async (fileId) => {
  try {
    // Primero obtener el file_path
    const fileInfo = await getFileInfo(fileId);
    const filePath = fileInfo.file_path;

    // Descargar el archivo
    const fileUrl = `${TELEGRAM_FILE_URL}/${filePath}`;
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer'
    });

    // Determinar content-type basado en la extensión
    const extension = filePath.split('.').pop().toLowerCase();
    const contentTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime'
    };

    return {
      data: Buffer.from(response.data),
      contentType: contentTypes[extension] || 'application/octet-stream',
      fileName: filePath.split('/').pop()
    };
  } catch (error) {
    console.error('Error descargando archivo de Telegram:', error.message);
    throw error;
  }
};

module.exports = {
  parseMessageWithHashtags,
  detectSensitiveData,
  processTextMessage,
  processPhotoMessage,
  processTelegramUpdate,
  verifyWebhookToken,
  getFileInfo,
  downloadFile
};
