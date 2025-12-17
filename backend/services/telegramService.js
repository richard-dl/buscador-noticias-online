/**
 * Servicio para integración con Bot de Telegram
 * Procesa mensajes del grupo VIP y extrae contenido con hashtags
 */

const { saveVipContent, getRecentVipContentByUser } = require('./firebaseService');
const axios = require('axios');

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_FILE_URL = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Configuración de agrupación
const BATCH_WINDOW_MINUTES = 5; // Ventana de tiempo para agrupar mensajes del mismo usuario
const { v4: uuidv4 } = require('uuid');

// Cache en memoria para tracking de batches activos
// Estructura: { odId: { groupId, lastMessageTime, userId } }
const activeBatches = new Map();

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
 * Determinar el groupId para un mensaje
 * - Si es reply a otro mensaje, usa el groupId del mensaje padre
 * - Si el usuario envió mensajes en los últimos X minutos, usa el mismo groupId (batch)
 * - Si no, crea un nuevo groupId
 */
const determineGroupId = async (message, chatId) => {
  const userId = message.from?.id || 'unknown';
  const now = Date.now();
  const batchKey = `${chatId}_${userId}`;

  // 1. Si es un reply, buscar el groupId del mensaje original
  if (message.reply_to_message) {
    const replyToMessageId = message.reply_to_message.message_id;
    console.log('[Grouping] Mensaje es reply a:', replyToMessageId);

    // Buscar en cache activa primero
    for (const [key, batch] of activeBatches.entries()) {
      if (batch.telegramMessageId === replyToMessageId) {
        console.log('[Grouping] Encontrado en cache, groupId:', batch.groupId);
        // Actualizar tiempo del batch
        activeBatches.set(key, { ...batch, lastMessageTime: now });
        return {
          groupId: batch.groupId,
          replyToMessageId,
          isReply: true
        };
      }
    }

    // Si no está en cache, el reply creará un nuevo grupo que incluirá la referencia
    console.log('[Grouping] Reply no encontrado en cache, creando nuevo grupo con referencia');
  }

  // 2. Verificar si hay un batch activo para este usuario
  const existingBatch = activeBatches.get(batchKey);
  if (existingBatch) {
    const timeDiff = (now - existingBatch.lastMessageTime) / 1000 / 60; // en minutos

    if (timeDiff < BATCH_WINDOW_MINUTES) {
      console.log(`[Grouping] Batch activo encontrado (${timeDiff.toFixed(1)} min), groupId:`, existingBatch.groupId);
      // Actualizar tiempo del batch
      activeBatches.set(batchKey, { ...existingBatch, lastMessageTime: now });
      return {
        groupId: existingBatch.groupId,
        replyToMessageId: message.reply_to_message?.message_id || null,
        isReply: !!message.reply_to_message
      };
    } else {
      console.log(`[Grouping] Batch expirado (${timeDiff.toFixed(1)} min > ${BATCH_WINDOW_MINUTES} min)`);
    }
  }

  // 3. Crear nuevo groupId
  const newGroupId = uuidv4();
  console.log('[Grouping] Creando nuevo groupId:', newGroupId);

  // Guardar en cache
  activeBatches.set(batchKey, {
    groupId: newGroupId,
    lastMessageTime: now,
    userId,
    telegramMessageId: message.message_id
  });

  // Limpiar batches viejos (más de 30 minutos)
  const cleanupThreshold = 30 * 60 * 1000;
  for (const [key, batch] of activeBatches.entries()) {
    if (now - batch.lastMessageTime > cleanupThreshold) {
      activeBatches.delete(key);
    }
  }

  return {
    groupId: newGroupId,
    replyToMessageId: message.reply_to_message?.message_id || null,
    isReply: !!message.reply_to_message
  };
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
      height: largestPhoto.height,
      type: 'photo'
    } : null
  };
};

/**
 * Procesar mensaje de Telegram con video
 */
const processVideoMessage = async (message) => {
  const parsed = await processTextMessage(message);

  const video = message.video;

  return {
    ...parsed,
    imagen: video ? {
      fileId: video.file_id,
      width: video.width,
      height: video.height,
      duration: video.duration,
      mimeType: video.mime_type,
      type: 'video'
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
  } else if (message.video) {
    console.log('[Webhook] Procesando mensaje con VIDEO');
    contentData = await processVideoMessage(message);
    console.log('[Webhook] Datos de video procesados:', JSON.stringify(contentData, null, 2));
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

  // Determinar groupId para agrupación de contenido relacionado
  console.log('[Webhook] Determinando groupId...');
  const groupingInfo = await determineGroupId(message, message.chat?.id);
  console.log('[Webhook] Grouping info:', groupingInfo);

  // Agregar información de agrupación al contenido
  contentData.groupId = groupingInfo.groupId;
  contentData.replyToMessageId = groupingInfo.replyToMessageId;
  contentData.isReply = groupingInfo.isReply;
  contentData.telegramUserId = message.from?.id || null;
  contentData.telegramUserName = message.from?.first_name || message.from?.username || null;

  console.log('[Webhook] Guardando contenido en Firestore...');

  // Guardar en Firestore
  const saved = await saveVipContent(contentData);

  return {
    processed: true,
    contentId: saved.id,
    groupId: groupingInfo.groupId,
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
  processVideoMessage,
  processTelegramUpdate,
  verifyWebhookToken,
  getFileInfo,
  downloadFile
};
