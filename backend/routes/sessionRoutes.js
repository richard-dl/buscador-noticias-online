const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getClientIp, getIpInfo } = require('../utils/ipUtils');
const {
  createSession,
  getActiveSessions,
  validateSession,
  revokeSession,
  revokeAllSessions,
  updateSessionSettings,
  getSessionSettings,
  SESSION_CONFIG
} = require('../services/firebaseService');

/**
 * POST /api/sessions/create
 * Crear nueva sesión al hacer login
 */
router.post('/create', authenticate, async (req, res) => {
  try {
    const { deviceId, deviceInfo } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'deviceId es requerido'
      });
    }

    const ip = getClientIp(req);
    const ipInfo = await getIpInfo(ip);

    const session = await createSession(req.user.uid, {
      deviceId,
      deviceInfo,
      ip,
      ipInfo
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        updated: session.updated || false
      }
    });
  } catch (error) {
    console.error('Error creando sesión:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear sesión'
    });
  }
});

/**
 * GET /api/sessions
 * Obtener sesiones activas del usuario
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const sessions = await getActiveSessions(req.user.uid);
    const settings = await getSessionSettings(req.user.uid);
    const currentSessionId = req.headers['x-session-id'];

    // Formatear para el frontend
    const formattedSessions = sessions.map(s => ({
      id: s.id,
      deviceInfo: s.deviceInfo || {},
      ip: s.ip,
      ipInfo: s.ipInfo || {},
      createdAt: s.createdAt?.toDate?.()?.toISOString() || null,
      lastActivity: s.lastActivity?.toDate?.()?.toISOString() || null,
      expiresAt: s.expiresAt?.toDate?.()?.toISOString() || null,
      isCurrent: s.id === currentSessionId
    }));

    res.json({
      success: true,
      data: {
        sessions: formattedSessions,
        settings
      }
    });
  } catch (error) {
    console.error('Error obteniendo sesiones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener sesiones'
    });
  }
});

/**
 * POST /api/sessions/validate
 * Validar sesión actual
 */
router.post('/validate', authenticate, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || req.body.sessionId;

    const result = await validateSession(req.user.uid, sessionId);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        error: result.reason,
        code: 'SESSION_INVALID'
      });
    }

    res.json({
      success: true,
      data: { valid: true }
    });
  } catch (error) {
    console.error('Error validando sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al validar sesión'
    });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Cerrar/revocar una sesión específica
 */
router.delete('/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId es requerido'
      });
    }

    await revokeSession(req.user.uid, sessionId, 'manual');

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });
  } catch (error) {
    console.error('Error cerrando sesión:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar sesión'
    });
  }
});

/**
 * DELETE /api/sessions
 * Cerrar todas las sesiones (excepto la actual)
 */
router.delete('/', authenticate, async (req, res) => {
  try {
    const currentSessionId = req.headers['x-session-id'];

    const revokedCount = await revokeAllSessions(
      req.user.uid,
      currentSessionId
    );

    res.json({
      success: true,
      message: `${revokedCount} sesión(es) cerrada(s)`,
      revokedCount
    });
  } catch (error) {
    console.error('Error cerrando sesiones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cerrar sesiones'
    });
  }
});

/**
 * PUT /api/sessions/settings
 * Actualizar configuración de sesiones
 */
router.put('/settings', authenticate, async (req, res) => {
  try {
    const { singleSessionMode, maxSessions } = req.body;

    const user = await updateSessionSettings(req.user.uid, {
      singleSessionMode,
      maxSessions
    });

    const settings = await getSessionSettings(req.user.uid);

    res.json({
      success: true,
      message: 'Configuración actualizada',
      data: settings
    });
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar configuración'
    });
  }
});

/**
 * GET /api/sessions/settings
 * Obtener configuración de sesiones
 */
router.get('/settings', authenticate, async (req, res) => {
  try {
    const settings = await getSessionSettings(req.user.uid);

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener configuración'
    });
  }
});

module.exports = router;
