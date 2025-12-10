const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const {
  createUserInFirestore,
  getUserFromFirestore,
  updateLastLogin,
  verifyIdToken,
  getAllUsersFromFirestore
} = require('../services/firebaseService');

/**
 * POST /api/auth/register
 * Registrar nuevo usuario (después de crearlo en Firebase Auth del frontend)
 */
router.post('/register', async (req, res) => {
  try {
    const { uid, email, displayName, authProvider } = req.body;

    if (!uid || !email) {
      return res.status(400).json({
        success: false,
        error: 'UID y email son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await getUserFromFirestore(uid);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'El usuario ya está registrado'
      });
    }

    // Crear usuario en Firestore con trial de 30 días
    const user = await createUserInFirestore(uid, {
      email,
      displayName: displayName || '',
      authProvider: authProvider || 'email'
    });

    res.status(201).json({
      success: true,
      message: 'Usuario registrado correctamente',
      data: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        trialDays: 30
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar usuario'
    });
  }
});

/**
 * POST /api/auth/login
 * Verificar login y actualizar último acceso
 */
router.post('/login', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token requerido'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verificar token
    const decodedToken = await verifyIdToken(token);

    // Obtener o crear usuario en Firestore
    let user = await getUserFromFirestore(decodedToken.uid);

    if (!user) {
      // Usuario nuevo (login con Google por primera vez)
      user = await createUserInFirestore(decodedToken.uid, {
        email: decodedToken.email,
        displayName: decodedToken.name || '',
        authProvider: 'google'
      });
    } else {
      // Actualizar último login y verificar suscripción
      user = await updateLastLogin(decodedToken.uid);
    }

    // Calcular días restantes
    const now = new Date();
    const expiresAt = user.expiresAt instanceof Date ? user.expiresAt : user.expiresAt?.toDate?.();
    const daysRemaining = expiresAt
      ? Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      success: true,
      data: {
        uid: decodedToken.uid,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        role: user.role || 'user', // Agregar role
        expiresAt: expiresAt?.toISOString(),
        daysRemaining: daysRemaining,
        isExpired: user.status === 'expired'
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(401).json({
      success: false,
      error: 'Error de autenticación'
    });
  }
});

/**
 * POST /api/auth/verify
 * Verificar si un token es válido
 */
router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Token requerido'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(token);

    res.json({
      success: true,
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      valid: false,
      error: 'Token inválido'
    });
  }
});

/**
 * GET /api/auth/users
 * Obtener lista de todos los usuarios (solo admin)
 */
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // Verificar que el usuario es admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Solo administradores pueden ver esta información.'
      });
    }

    const users = await getAllUsersFromFirestore();

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios'
    });
  }
});

module.exports = router;
