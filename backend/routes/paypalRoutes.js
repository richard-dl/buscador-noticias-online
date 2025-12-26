const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const paypalService = require('../services/paypalService');
const {
  activateSuscriptor,
  activateVipAnnual,
  savePaymentRecord
} = require('../services/firebaseService');

/**
 * GET /api/paypal/config
 * Obtener configuración de PayPal para el frontend (Client ID)
 */
router.get('/config', (req, res) => {
  try {
    const config = paypalService.verifyConfig();
    res.json({
      success: true,
      data: {
        clientId: config.clientId,
        mode: config.mode
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/paypal/create-order
 * Crear una orden de PayPal
 * Requiere autenticación
 */
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { planType } = req.body;

    if (!planType || !['suscriptor', 'vip'].includes(planType)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de plan no válido. Debe ser "suscriptor" o "vip"'
      });
    }

    const userData = {
      uid: req.user.uid,
      email: req.user.email
    };

    const order = await paypalService.createOrder(planType, userData);

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error creando orden de PayPal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al crear orden de pago'
    });
  }
});

/**
 * POST /api/paypal/capture-order
 * Capturar el pago de una orden aprobada y activar la suscripción
 * Requiere autenticación
 */
router.post('/capture-order', authenticate, async (req, res) => {
  try {
    const { orderId, planType } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID de la orden'
      });
    }

    // Capturar el pago en PayPal
    const captureResult = await paypalService.captureOrder(orderId);

    // Verificar que el pago fue exitoso
    if (captureResult.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'El pago no fue completado',
        paymentStatus: captureResult.status
      });
    }

    // Verificar que el usuario coincide
    if (captureResult.userId && captureResult.userId !== req.user.uid) {
      console.warn(`Usuario mismatch: orden para ${captureResult.userId}, request de ${req.user.uid}`);
    }

    // Preparar datos del pago para guardar
    const paymentData = {
      paymentId: captureResult.captureId,
      orderId: captureResult.orderId,
      paymentMethod: 'paypal',
      payerEmail: captureResult.payerEmail,
      payerName: captureResult.payerName,
      amount: captureResult.amount,
      currency: captureResult.currency
    };

    // Activar la suscripción correspondiente
    let user;
    const effectivePlanType = planType || captureResult.planType;

    if (effectivePlanType === 'suscriptor') {
      user = await activateSuscriptor(req.user.uid, paymentData);
    } else if (effectivePlanType === 'vip') {
      user = await activateVipAnnual(req.user.uid, paymentData);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Tipo de plan no reconocido en el pago'
      });
    }

    // Guardar registro del pago
    try {
      await savePaymentRecord({
        ...paymentData,
        userId: req.user.uid,
        userEmail: req.user.email,
        planType: effectivePlanType,
        capturedAt: new Date(),
        paypalDetails: captureResult
      });
    } catch (saveError) {
      console.error('Error guardando registro de pago (no crítico):', saveError);
    }

    res.json({
      success: true,
      message: `Pago procesado y ${effectivePlanType === 'vip' ? 'VIP' : 'suscripción'} activada correctamente`,
      data: {
        paymentId: captureResult.captureId,
        orderId: captureResult.orderId,
        amount: captureResult.amount,
        currency: captureResult.currency,
        role: user.role,
        planType: effectivePlanType
      }
    });
  } catch (error) {
    console.error('Error capturando orden de PayPal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar el pago'
    });
  }
});

/**
 * GET /api/paypal/order/:orderId
 * Obtener detalles de una orden (para verificación)
 * Requiere autenticación
 */
router.get('/order/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const orderDetails = await paypalService.getOrderDetails(orderId);

    res.json({
      success: true,
      data: orderDetails
    });
  } catch (error) {
    console.error('Error obteniendo detalles de orden:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener detalles del pago'
    });
  }
});

module.exports = router;
