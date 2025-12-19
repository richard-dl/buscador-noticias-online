const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  getSubscriptionStatus,
  activateSuscriptor,
  activateVipTrial,
  activateVipAnnual,
  SUBSCRIPTION_CONFIG
} = require('../services/firebaseService');

/**
 * GET /api/subscription/plans
 * Obtener información de los planes disponibles (público)
 */
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    data: {
      trial: {
        name: 'Trial',
        description: 'Período de prueba gratuito',
        price: 0,
        currency: 'USD',
        duration: `${SUBSCRIPTION_CONFIG.TRIAL_DAYS} días`,
        features: [
          'Búsqueda de noticias de último momento',
          'Filtros por ubicación y temática',
          'Guardar noticias favoritas',
          'Perfiles de búsqueda personalizados'
        ],
        limitations: [
          'Sin acceso a herramientas de IA',
          'Período limitado a 30 días'
        ]
      },
      suscriptor: {
        name: 'Suscriptor',
        description: 'Acceso vitalicio a la plataforma',
        price: SUBSCRIPTION_CONFIG.PRICES.SUSCRIPTOR,
        currency: 'USD',
        duration: 'Vitalicio',
        paymentType: 'Pago único',
        features: [
          'Todo lo incluido en Trial',
          'Acceso permanente sin vencimiento',
          'Soporte prioritario'
        ],
        limitations: [
          'Sin acceso a herramientas de IA'
        ]
      },
      vip_trial: {
        name: 'VIP Trial',
        description: 'Prueba gratuita de la zona VIP',
        price: 0,
        currency: 'USD',
        duration: `${SUBSCRIPTION_CONFIG.VIP_TRIAL_DAYS} días`,
        requirements: ['Ser suscriptor activo'],
        features: [
          'Todo lo incluido en Suscriptor',
          'Acceso completo a herramientas de IA',
          'Resúmenes automáticos de noticias',
          'Análisis de contenido con IA'
        ],
        limitations: [
          'Período limitado a 30 días',
          'Solo disponible una vez'
        ]
      },
      vip: {
        name: 'VIP Anual',
        description: 'Acceso completo a toda la plataforma',
        price: SUBSCRIPTION_CONFIG.PRICES.VIP_ANNUAL,
        currency: 'USD',
        duration: '1 año',
        paymentType: 'Pago anual',
        requirements: ['Ser suscriptor activo'],
        features: [
          'Todo lo incluido en Suscriptor',
          'Acceso completo a herramientas de IA',
          'Resúmenes automáticos de noticias',
          'Análisis de contenido con IA',
          'Contenido exclusivo VIP',
          'Soporte premium'
        ],
        limitations: []
      }
    }
  });
});

/**
 * GET /api/subscription/status
 * Obtener estado de suscripción del usuario autenticado
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await getSubscriptionStatus(req.user.uid);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error obteniendo estado de suscripción:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado de suscripción'
    });
  }
});

/**
 * POST /api/subscription/activate-suscriptor
 * Activar suscripción vitalicia ($39 USD)
 * Requiere: rol trial + pago confirmado
 */
router.post('/activate-suscriptor', authenticate, async (req, res) => {
  try {
    const { paymentId, paymentMethod } = req.body;

    // En producción, aquí verificarías el pago con la pasarela
    // Por ahora, solo requerimos que venga un paymentId
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere confirmación de pago'
      });
    }

    const user = await activateSuscriptor(req.user.uid, {
      paymentId,
      paymentMethod: paymentMethod || 'unknown'
    });

    res.json({
      success: true,
      message: 'Suscripción activada correctamente',
      data: {
        role: user.role,
        subscriptionPaidAt: user.subscriptionPaidAt
      }
    });
  } catch (error) {
    console.error('Error activando suscriptor:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al activar suscripción'
    });
  }
});

/**
 * POST /api/subscription/activate-vip-trial
 * Activar período de prueba VIP (30 días gratis)
 * Requiere: rol suscriptor + no haber usado VIP trial antes
 */
router.post('/activate-vip-trial', authenticate, async (req, res) => {
  try {
    const user = await activateVipTrial(req.user.uid);

    res.json({
      success: true,
      message: 'Período de prueba VIP activado',
      data: {
        role: user.role,
        vipTrialExpiresAt: user.vipTrialExpiresAt,
        daysRemaining: SUBSCRIPTION_CONFIG.VIP_TRIAL_DAYS
      }
    });
  } catch (error) {
    console.error('Error activando VIP trial:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al activar período de prueba VIP'
    });
  }
});

/**
 * POST /api/subscription/activate-vip
 * Activar suscripción VIP anual ($90 USD)
 * Requiere: rol vip_trial o suscriptor + pago confirmado
 */
router.post('/activate-vip', authenticate, async (req, res) => {
  try {
    const { paymentId, paymentMethod } = req.body;

    // En producción, aquí verificarías el pago con la pasarela
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere confirmación de pago'
      });
    }

    const user = await activateVipAnnual(req.user.uid, {
      paymentId,
      paymentMethod: paymentMethod || 'unknown'
    });

    // Calcular días restantes
    const now = new Date();
    const vipExpiresAt = user.vipExpiresAt?.toDate ? user.vipExpiresAt.toDate() : new Date(user.vipExpiresAt);
    const daysRemaining = Math.ceil((vipExpiresAt - now) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      message: 'Suscripción VIP activada correctamente',
      data: {
        role: user.role,
        vipExpiresAt: vipExpiresAt,
        daysRemaining: daysRemaining
      }
    });
  } catch (error) {
    console.error('Error activando VIP:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al activar suscripción VIP'
    });
  }
});

/**
 * POST /api/subscription/renew-vip
 * Renovar suscripción VIP anual
 * Requiere: rol vip + pago confirmado
 */
router.post('/renew-vip', authenticate, async (req, res) => {
  try {
    const { paymentId, paymentMethod } = req.body;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere confirmación de pago'
      });
    }

    // Verificar que sea VIP actual
    if (req.user.role !== 'vip' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Solo usuarios VIP pueden renovar'
      });
    }

    const user = await activateVipAnnual(req.user.uid, {
      paymentId,
      paymentMethod: paymentMethod || 'unknown'
    });

    const now = new Date();
    const vipExpiresAt = user.vipExpiresAt?.toDate ? user.vipExpiresAt.toDate() : new Date(user.vipExpiresAt);
    const daysRemaining = Math.ceil((vipExpiresAt - now) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      message: 'Suscripción VIP renovada correctamente',
      data: {
        role: user.role,
        vipExpiresAt: vipExpiresAt,
        daysRemaining: daysRemaining
      }
    });
  } catch (error) {
    console.error('Error renovando VIP:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al renovar suscripción VIP'
    });
  }
});

module.exports = router;
