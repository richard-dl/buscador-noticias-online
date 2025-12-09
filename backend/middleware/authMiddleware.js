const { verifyIdToken, checkSubscriptionStatus, getUserFromFirestore } = require('../services/firebaseService');

/**
 * Middleware para verificar autenticación
 * Extrae el token del header Authorization y lo valida
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

    // Si el usuario es admin, bypass la verificación de suscripción
    if (req.user.role === 'admin') {
      req.subscription = {
        valid: true,
        isAdmin: true,
        plan: 'admin',
        daysRemaining: 999
      };
      return next();
    }

    const subscription = await checkSubscriptionStatus(req.user.uid);

    if (!subscription.valid) {
      return res.status(403).json({
        success: false,
        error: 'Suscripción expirada',
        reason: subscription.reason,
        expiredAt: subscription.expiredAt,
        code: 'SUBSCRIPTION_EXPIRED'
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

module.exports = {
  authenticate,
  requireActiveSubscription,
  authenticateAndRequireSubscription
};
