const express = require('express');
const router = express.Router();
const { authenticateAndRequireVip, authenticate } = require('../middleware/authMiddleware');
const { getVipContent, deleteVipContent, checkVipAccess, updateUserRole } = require('../services/firebaseService');
const { processTelegramUpdate, verifyWebhookToken, downloadFile } = require('../services/telegramService');

/**
 * GET /api/vip/content
 * Obtener contenido VIP (requiere acceso VIP)
 */
router.get('/content', authenticateAndRequireVip, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
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

/**
 * GET /api/vip/media/:fileId
 * Proxy para servir archivos multimedia de Telegram
 * No requiere autenticación para permitir carga en img tags
 * El fileId es único y no predecible, actuando como token temporal
 */
router.get('/media/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    console.log('[VIP Media] Solicitando fileId:', fileId);
    console.log('[VIP Media] Token configurado:', process.env.TELEGRAM_BOT_TOKEN ? 'Sí (' + process.env.TELEGRAM_BOT_TOKEN.substring(0, 10) + '...)' : 'NO');

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'fileId es requerido'
      });
    }

    // Descargar archivo de Telegram
    const file = await downloadFile(fileId);
    console.log('[VIP Media] Archivo descargado:', file.fileName, file.contentType, file.data?.length, 'bytes');

    // Configurar headers para CORS, cache y tipo de contenido
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="${file.fileName}"`,
      'Cache-Control': 'public, max-age=86400', // Cache por 24 horas
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    });

    // Enviar el archivo
    res.send(file.data);
  } catch (error) {
    console.error('[VIP Media] Error sirviendo archivo:', error.message);
    console.error('[VIP Media] Error completo:', error.response?.data || error);
    res.status(404).json({
      success: false,
      error: 'Archivo no encontrado o no disponible',
      debug: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

module.exports = router;
