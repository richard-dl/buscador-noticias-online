const express = require('express');
const router = express.Router();
const { authenticateAndRequireVip, authenticate } = require('../middleware/authMiddleware');
const { getVipContent, deleteVipContent, updateVipContent, checkVipAccess, updateUserRole } = require('../services/firebaseService');
const { processTelegramUpdate, verifyWebhookToken, downloadFile } = require('../services/telegramService');

/**
 * GET /api/vip/content
 * Obtener contenido VIP (requiere acceso VIP)
 */
router.get('/content', authenticateAndRequireVip, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 150;
    const content = await getVipContent(limit);

    res.json({
      success: true,
      data: content,
      vipStatus: req.vipStatus
    });
  } catch (error) {
    console.error('Error obteniendo contenido VIP:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contenido VIP'
    });
  }
});

/**
 * GET /api/vip/status
 * Verificar estado VIP del usuario
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const vipStatus = await checkVipAccess(req.user.uid);

    res.json({
      success: true,
      data: vipStatus
    });
  } catch (error) {
    console.error('Error verificando estado VIP:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar estado VIP'
    });
  }
});

/**
 * DELETE /api/vip/content/:id
 * Eliminar contenido VIP (solo admin)
 */
router.delete('/content/:id', authenticateAndRequireVip, async (req, res) => {
  try {
    // Solo admin puede eliminar contenido
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden eliminar contenido'
      });
    }

    await deleteVipContent(req.params.id);

    res.json({
      success: true,
      message: 'Contenido eliminado correctamente'
    });
  } catch (error) {
    console.error('Error eliminando contenido VIP:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar contenido VIP'
    });
  }
});

/**
 * PUT /api/vip/content/:id
 * Actualizar contenido VIP (solo admin)
 */
router.put('/content/:id', authenticateAndRequireVip, async (req, res) => {
  try {
    // Solo admin puede editar contenido
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden editar contenido'
      });
    }

    const { titulo, fuente, contenido } = req.body;
    const updated = await updateVipContent(req.params.id, { titulo, fuente, contenido });

    res.json({
      success: true,
      data: updated,
      message: 'Contenido actualizado correctamente'
    });
  } catch (error) {
    console.error('Error actualizando contenido VIP:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al actualizar contenido VIP'
    });
  }
});

/**
 * POST /api/vip/webhook/telegram
 * Webhook para recibir actualizaciones de Telegram
 */
router.post('/webhook/telegram', async (req, res) => {
  // Log inmediato de TODA la request
  console.log('[Webhook Route] ====== REQUEST RECIBIDA ======');
  console.log('[Webhook Route] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('[Webhook Route] Body:', JSON.stringify(req.body, null, 2));
  console.log('[Webhook Route] Query:', JSON.stringify(req.query, null, 2));

  try {
    // Verificar token secreto si está configurado
    const webhookToken = req.query.token || req.headers['x-telegram-bot-api-secret-token'];
    if (process.env.TELEGRAM_WEBHOOK_SECRET && !verifyWebhookToken(webhookToken)) {
      console.log('[Webhook Route] Token inválido');
      return res.status(401).json({
        success: false,
        error: 'Token de webhook inválido'
      });
    }

    const update = req.body;

    if (!update) {
      console.log('[Webhook Route] No hay body');
      return res.status(400).json({
        success: false,
        error: 'No update data received'
      });
    }

    console.log('[Webhook Route] Procesando update...');
    const result = await processTelegramUpdate(update);
    console.log('[Webhook Route] Resultado:', JSON.stringify(result, null, 2));

    // Telegram espera 200 OK para confirmar recepción
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error procesando webhook de Telegram:', error);
    // Aún así devolver 200 para que Telegram no reintente
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/vip/upgrade/:uid
 * Actualizar rol de usuario a VIP (solo admin)
 */
router.post('/upgrade/:uid', authenticate, async (req, res) => {
  try {
    // Solo admin puede actualizar roles
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden actualizar roles'
      });
    }

    const { role, vipExpiresAt } = req.body;
    const updatedUser = await updateUserRole(req.params.uid, role, vipExpiresAt);

    res.json({
      success: true,
      data: updatedUser,
      message: `Usuario actualizado a rol: ${role}`
    });
  } catch (error) {
    console.error('Error actualizando rol:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al actualizar rol'
    });
  }
});

// Cache simple en memoria para archivos de Telegram (evita re-descargas en Range requests)
const fileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const getCachedFile = async (fileId) => {
  const cached = fileCache.get(fileId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[VIP Media] Cache hit para:', fileId);
    return cached.file;
  }

  const file = await downloadFile(fileId);
  fileCache.set(fileId, { file, timestamp: Date.now() });

  // Limpiar cache viejo
  if (fileCache.size > 50) {
    const oldest = [...fileCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    fileCache.delete(oldest[0]);
  }

  return file;
};

/**
 * OPTIONS /api/vip/media/:fileId
 * Preflight para CORS
 */
router.options('/media/:fileId', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Max-Age': '86400'
  });
  res.status(204).end();
});

/**
 * HEAD /api/vip/media/:fileId
 * Metadata del archivo (requerido por video players)
 */
router.head('/media/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await getCachedFile(fileId);

    res.set({
      'Content-Type': file.contentType,
      'Content-Length': file.data.length,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Accept-Ranges',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    });
    res.status(200).end();
  } catch (error) {
    res.status(404).end();
  }
});

/**
 * GET /api/vip/media/:fileId
 * Proxy para servir archivos multimedia de Telegram
 * No requiere autenticación para permitir carga en img tags
 * El fileId es único y no predecible, actuando como token temporal
 * Soporta Range requests para streaming de video (requerido por Brave y otros navegadores)
 */
router.get('/media/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'fileId es requerido'
      });
    }

    // Descargar archivo de Telegram (con cache)
    const file = await getCachedFile(fileId);
    const fileSize = file.data.length;
    console.log('[VIP Media] Archivo descargado:', file.fileName, file.contentType, fileSize, 'bytes');

    // Headers base para CORS
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    });

    // Para videos, soportar Range requests (requerido para streaming en Brave/Chrome)
    if (file.contentType.startsWith('video/')) {
      const range = req.headers.range;

      if (range) {
        // Parsear el header Range
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        console.log('[VIP Media] Range request:', start, '-', end, '/', fileSize);

        res.status(206);
        res.set({
          'Content-Type': file.contentType,
          'Content-Length': chunkSize,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400'
        });

        // Enviar solo el chunk solicitado
        res.send(file.data.slice(start, end + 1));
      } else {
        // Sin Range header - enviar completo
        res.set({
          'Content-Type': file.contentType,
          'Content-Length': fileSize,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400'
        });
        res.send(file.data);
      }
    } else {
      // Para imágenes y otros archivos
      res.set({
        'Content-Type': file.contentType,
        'Content-Length': fileSize,
        'Content-Disposition': `inline; filename="${file.fileName}"`,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff'
      });
      res.send(file.data);
    }
  } catch (error) {
    console.error('[VIP Media] Error sirviendo archivo:', error.message);
    res.status(404).json({
      success: false,
      error: 'Archivo no encontrado o no disponible'
    });
  }
});

module.exports = router;
