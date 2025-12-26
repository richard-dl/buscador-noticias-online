/**
 * PayPal Service - Integración con PayPal REST API
 * Maneja la creación de órdenes y captura de pagos
 */

const axios = require('axios');

// Configuración según el modo (sandbox o live)
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

/**
 * Obtiene un token de acceso de PayPal
 */
async function getAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const response = await axios({
      method: 'post',
      url: `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: 'grant_type=client_credentials'
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error obteniendo token de PayPal:', error.response?.data || error.message);
    throw new Error('Error de autenticación con PayPal');
  }
}

/**
 * Crea una orden de PayPal
 * @param {string} planType - Tipo de plan: 'suscriptor' o 'vip'
 * @param {object} userData - Datos del usuario (uid, email)
 */
async function createOrder(planType, userData) {
  try {
    const accessToken = await getAccessToken();

    // Definir precios según el plan
    const prices = {
      suscriptor: {
        amount: '39.00',
        description: 'Suscripción Vitalicia - Buscador de Noticias',
        name: 'Plan Suscriptor'
      },
      vip: {
        amount: '90.00',
        description: 'Suscripción VIP Anual - Buscador de Noticias',
        name: 'Plan VIP Anual'
      }
    };

    const plan = prices[planType];
    if (!plan) {
      throw new Error('Tipo de plan no válido');
    }

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `${planType}_${userData.uid}_${Date.now()}`,
        description: plan.description,
        custom_id: JSON.stringify({
          planType,
          userId: userData.uid,
          userEmail: userData.email
        }),
        amount: {
          currency_code: 'USD',
          value: plan.amount,
          breakdown: {
            item_total: {
              currency_code: 'USD',
              value: plan.amount
            }
          }
        },
        items: [{
          name: plan.name,
          description: plan.description,
          unit_amount: {
            currency_code: 'USD',
            value: plan.amount
          },
          quantity: '1',
          category: 'DIGITAL_GOODS'
        }]
      }],
      application_context: {
        brand_name: 'Buscador de Noticias Online',
        locale: 'es-AR',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING'
      }
    };

    const response = await axios({
      method: 'post',
      url: `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: orderData
    });

    console.log(`Orden PayPal creada: ${response.data.id} para plan ${planType}`);

    return {
      orderId: response.data.id,
      status: response.data.status,
      links: response.data.links
    };
  } catch (error) {
    console.error('Error creando orden de PayPal:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Error al crear orden de pago');
  }
}

/**
 * Captura el pago de una orden aprobada
 * @param {string} orderId - ID de la orden de PayPal
 */
async function captureOrder(orderId) {
  try {
    const accessToken = await getAccessToken();

    const response = await axios({
      method: 'post',
      url: `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const captureData = response.data;

    // Extraer información del pago
    const capture = captureData.purchase_units[0]?.payments?.captures[0];
    const customId = captureData.purchase_units[0]?.custom_id;

    let parsedCustomId = {};
    try {
      parsedCustomId = JSON.parse(customId);
    } catch (e) {
      console.warn('No se pudo parsear custom_id:', customId);
    }

    const result = {
      orderId: captureData.id,
      status: captureData.status,
      payerId: captureData.payer?.payer_id,
      payerEmail: captureData.payer?.email_address,
      payerName: captureData.payer?.name?.given_name + ' ' + (captureData.payer?.name?.surname || ''),
      captureId: capture?.id,
      captureStatus: capture?.status,
      amount: capture?.amount?.value,
      currency: capture?.amount?.currency_code,
      planType: parsedCustomId.planType,
      userId: parsedCustomId.userId,
      userEmail: parsedCustomId.userEmail,
      createTime: captureData.create_time,
      updateTime: captureData.update_time
    };

    console.log(`Pago capturado: ${result.captureId} - ${result.amount} ${result.currency}`);

    return result;
  } catch (error) {
    console.error('Error capturando pago de PayPal:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Error al procesar el pago');
  }
}

/**
 * Obtiene los detalles de una orden
 * @param {string} orderId - ID de la orden de PayPal
 */
async function getOrderDetails(orderId) {
  try {
    const accessToken = await getAccessToken();

    const response = await axios({
      method: 'get',
      url: `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error obteniendo detalles de orden:', error.response?.data || error.message);
    throw new Error('Error al obtener detalles del pago');
  }
}

/**
 * Verifica que las credenciales de PayPal estén configuradas
 */
function verifyConfig() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('Las credenciales de PayPal no están configuradas');
  }
  return {
    mode: PAYPAL_MODE,
    clientId: PAYPAL_CLIENT_ID,
    baseUrl: PAYPAL_BASE_URL
  };
}

module.exports = {
  createOrder,
  captureOrder,
  getOrderDetails,
  getAccessToken,
  verifyConfig,
  PAYPAL_MODE,
  PAYPAL_CLIENT_ID
};
