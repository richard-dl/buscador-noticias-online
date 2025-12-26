const {
  verifyIdToken,
  checkSubscriptionStatus,
  getUserFromFirestore,
  checkVipAccess,
  getSubscriptionStatus,
  validateSession
} = require('../services/firebaseService');

// Rutas que no requieren validación de sesión
const SESSION_SKIP_PATHS = [
  '/api/sessions/create',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify'
];

/**
 * Middleware para verificar autenticación y sesión
 * Extrae el token del header Authorization y lo valida
 * También valida la sesión si está presente
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación inválido'
      });
    }

    // Verificar token con Firebase
    const decodedToken = await verifyIdToken(token);

    // Obtener datos del usuario de Firestore
    const user = await getUserFromFirestore(decodedToken.uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado en la base de datos'
      });
    }

    // Agregar usuario al request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...user
    };

    // ========== Validar sesión activa ==========
    const sessionId = req.headers['x-session-id'];
    const fullPath = req.originalUrl || req.path;

    // Solo validar sesión si:
    // 1. Hay sessionId en el header
    // 2. No es una ruta excluida
    const shouldValidateSession = sessionId &&
      !SESSION_SKIP_PATHS.some(path => fullPath.startsWith(path));

    if (shouldValidateSession) {
      const sessionResult = await validateSession(decodedToken.uid, sessionId);

      if (!sessionResult.valid) {
        return res.status(401).json({
          success: false,
          error: sessionResult.reason,
          code: 'SESSION_INVALID',
          requireReauth: true
        });
      }
    }
    // ===========================================

    next();
  } catch (error) {
    console.error('Error en autenticación:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    });
  }
};

/**
 * Middleware para verificar suscripción activa
 * Permite acceso a: trial (activo), suscriptor, vip_trial, vip, admin
 * Debe usarse después del middleware authenticate
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const subscription = await getSubscriptionStatus(req.user.uid);

    // Admin siempre tiene acceso
    if (subscription.isAdmin) {
      req.subscription = subscription;
      return next();
    }

    // Verificar que la suscripción sea válida
    if (!subscription.valid) {
      return res.status(403).json({
        success: false,
        error: 'Suscripción expirada',
        reason: subscription.reason,
        expiredAt: subscription.expiredAt,
        code: 'SUBSCRIPTION_EXPIRED',
        canUpgradeTo: subscription.canUpgradeTo
      });
    }

    // Agregar info de suscripción al request
    req.subscription = subscription;

    next();
  } catch (error) {
    console.error('Error verificando suscripción:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error verificando estado de suscripción'
    });
  }
};

/**
 * Middleware combinado: autenticación + suscripción activa
 */
const authenticateAndRequireSubscription = [authenticate, requireActiveSubscription];

/**
 * Middleware para verificar acceso VIP
 * Debe usarse después del middleware authenticate
 */
const requireVipAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const vipStatus = await checkVipAccess(req.user.uid);

    if (!vipStatus.hasAccess) {
      return res.status(403).json({
        success: false,
        error: vipStatus.reason || 'Acceso VIP requerido',
        expiredAt: vipStatus.expiredAt,
        code: 'VIP_REQUIRED'
      });
    }

    // Agregar info VIP al request
    req.vipStatus = vipStatus;

    next();
  } catch (error) {
    console.error('Error verificando acceso VIP:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error verificando acceso VIP'
    });
  }
};

/**
 * Middleware combinado: autenticación + acceso VIP
 */
const authenticateAndRequireVip = [authenticate, requireVipAccess];

/**
 * Middleware para verificar rol de administrador
 * Debe usarse después del middleware authenticate
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requiere rol de administrador.',
        code: 'ADMIN_REQUIRED'
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando rol admin:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error verificando permisos'
    });
  }
};

/**
 * Middleware para verificar rol de suscriptor o superior
 * Permite: suscriptor, vip_trial, vip, admin
 * Debe usarse después del middleware authenticate
 */
const requireSuscriptor = async (req, res, next) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const allowedRoles = ['suscriptor', 'vip_trial', 'vip', 'admin'];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Se requiere suscripción activa para acceder a esta función',
        code: 'SUSCRIPTOR_REQUIRED',
        currentRole: req.user.role
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando rol suscriptor:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error verificando permisos'
    });
  }
};

/**
 * Middleware combinado: autenticación + rol admin
 */
const authenticateAndRequireAdmin = [authenticate, requireAdmin];

/**
 * Middleware combinado: autenticación + rol suscriptor o superior
 */
const authenticateAndRequireSuscriptor = [authenticate, requireSuscriptor];

module.exports = {
  authenticate,
  requireActiveSubscription,
  authenticateAndRequireSubscription,
  requireVipAccess,
  authenticateAndRequireVip,
  requireAdmin,
  requireSuscriptor,
  authenticateAndRequireAdmin,
  authenticateAndRequireSuscriptor
};
