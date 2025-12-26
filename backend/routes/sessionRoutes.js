const express = require('express');
const router = express.Router();
const { authenticate, isSuperAdmin } = require('../middleware/authMiddleware');
const { getClientIp, getIpInfo } = require('../utils/ipUtils');
const {
  createSession,
  getActiveSessions,
  validateSession,
  revokeSession,
  revokeAllSessions,
  updateSessionSettings,
  getSessionSettings,
  SESSION_CONFIG,
  getAllUsersWithSessions,
  adminRevokeSession,
  adminRevokeAllUserSessions,
  adminUpdateUserSessionSettings
} = require('../services/firebaseService');

/**
 * GET /api/sessions/debug
 * DEBUG: Ver información del usuario autenticado
 */
router.get('/debug', authenticate, async (req, res) => {
  res.json({
    success: true,
    debug: {
      uid: req.user.uid,
      email: req.user.email,
      role: req.user.role,
      allUserData: req.user
    }
  });
});

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

// ==================== ENDPOINTS DE SUPERADMIN ====================

/**
 * GET /api/sessions/admin/users
 * Obtener todos los usuarios con sus sesiones (solo superadmin)
 */
router.get('/admin/users', authenticate, isSuperAdmin, async (req, res) => {
  try {
    const users = await getAllUsersWithSessions(req.user.role);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error obteniendo usuarios con sesiones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios'
    });
  }
});

/**
 * DELETE /api/sessions/admin/users/:uid/sessions/:sessionId
 * Cerrar sesión específica de un usuario (solo superadmin)
 */
router.delete('/admin/users/:uid/sessions/:sessionId', authenticate, isSuperAdmin, async (req, res) => {
  try {
    const { uid, sessionId } = req.params;

    await adminRevokeSession(uid, sessionId);

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
 * DELETE /api/sessions/admin/users/:uid/sessions
 * Cerrar todas las sesiones de un usuario (solo superadmin)
 */
router.delete('/admin/users/:uid/sessions', authenticate, isSuperAdmin, async (req, res) => {
  try {
    const { uid } = req.params;

    const count = await adminRevokeAllUserSessions(uid);

    res.json({
      success: true,
      message: `${count} sesión(es) cerrada(s)`,
      revokedCount: count
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
 * PUT /api/sessions/admin/users/:uid/settings
 * Actualizar configuración de sesiones de un usuario (solo superadmin)
 */
router.put('/admin/users/:uid/settings', authenticate, isSuperAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { singleSessionMode, maxSessions } = req.body;

    const settings = await adminUpdateUserSessionSettings(uid, {
      singleSessionMode,
      maxSessions
    });

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

module.exports = router;
