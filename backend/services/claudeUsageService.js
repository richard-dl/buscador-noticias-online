const admin = require('firebase-admin');

// Obtener instancia de Firestore
const getDb = () => admin.firestore();

/**
 * Colección: claudeUsage
 * Estructura de documento:
 * {
 *   userId: string | null (null para usuarios no autenticados)
 *   userEmail: string | null
 *   endpoint: string (ej: '/api/news/recent', '/api/news/rss')
 *   operation: string (ej: 'classifyBatch', 'processNews', 'generateSummary')
 *   tokensInput: number (tokens de entrada estimados)
 *   tokensOutput: number (tokens de salida estimados)
 *   model: string (ej: 'claude-3-haiku-20240307')
 *   success: boolean
 *   errorMessage: string | null
 *   ip: string | null
 *   userAgent: string | null
 *   timestamp: Timestamp
 *   date: string (YYYY-MM-DD para agregaciones)
 *   month: string (YYYY-MM para agregaciones mensuales)
 * }
 */

/**
 * Registrar uso de la API de Claude
 * @param {Object} usageData - Datos del uso
 */
const trackClaudeUsage = async (usageData) => {
  try {
    const db = getDb();
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const month = date.substring(0, 7); // YYYY-MM

    await db.collection('claudeUsage').add({
      userId: usageData.userId || null,
      userEmail: usageData.userEmail || null,
      endpoint: usageData.endpoint || 'unknown',
      operation: usageData.operation || 'unknown',
      tokensInput: usageData.tokensInput || 0,
      tokensOutput: usageData.tokensOutput || 0,
      model: usageData.model || 'claude-3-haiku-20240307',
      success: usageData.success !== false,
      errorMessage: usageData.errorMessage || null,
      ip: usageData.ip || null,
      userAgent: usageData.userAgent || null,
      newsCount: usageData.newsCount || 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      date,
      month
    });
  } catch (error) {
    // No fallar silenciosamente pero tampoco bloquear la operación principal
    console.error('[ClaudeUsage] Error registrando uso:', error.message);
  }
};

/**
 * Obtener estadísticas generales de uso de Claude
 * @returns {Promise<Object>} Estadísticas
 */
const getUsageStats = async () => {
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentMonth = today.substring(0, 7);

  // Fecha de hace 30 días
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  try {
    // Estadísticas de hoy
    const todaySnapshot = await db.collection('claudeUsage')
      .where('date', '==', today)
      .get();

    // Estadísticas del mes
    const monthSnapshot = await db.collection('claudeUsage')
      .where('month', '==', currentMonth)
      .get();

    // Estadísticas de los últimos 30 días
    const last30DaysSnapshot = await db.collection('claudeUsage')
      .where('date', '>=', thirtyDaysAgoStr)
      .get();

    // Total histórico
    const totalSnapshot = await db.collection('claudeUsage').get();

    // Calcular métricas
    const calculateMetrics = (docs) => {
      let totalCalls = 0;
      let totalTokensInput = 0;
      let totalTokensOutput = 0;
      let successCount = 0;
      let errorCount = 0;
      const byEndpoint = {};
      const byOperation = {};
      const byUser = {};

      docs.forEach(doc => {
        const data = doc.data();
        totalCalls++;
        totalTokensInput += data.tokensInput || 0;
        totalTokensOutput += data.tokensOutput || 0;

        if (data.success) {
          successCount++;
        } else {
          errorCount++;
        }

        // Por endpoint
        const endpoint = data.endpoint || 'unknown';
        if (!byEndpoint[endpoint]) {
          byEndpoint[endpoint] = { calls: 0, tokens: 0 };
        }
        byEndpoint[endpoint].calls++;
        byEndpoint[endpoint].tokens += (data.tokensInput || 0) + (data.tokensOutput || 0);

        // Por operación
        const operation = data.operation || 'unknown';
        if (!byOperation[operation]) {
          byOperation[operation] = { calls: 0, tokens: 0 };
        }
        byOperation[operation].calls++;
        byOperation[operation].tokens += (data.tokensInput || 0) + (data.tokensOutput || 0);

        // Por usuario
        const userId = data.userId || 'anonymous';
        const userEmail = data.userEmail || 'No autenticado';
        if (!byUser[userId]) {
          byUser[userId] = { email: userEmail, calls: 0, tokens: 0 };
        }
        byUser[userId].calls++;
        byUser[userId].tokens += (data.tokensInput || 0) + (data.tokensOutput || 0);
      });

      return {
        totalCalls,
        totalTokensInput,
        totalTokensOutput,
        totalTokens: totalTokensInput + totalTokensOutput,
        successCount,
        errorCount,
        successRate: totalCalls > 0 ? ((successCount / totalCalls) * 100).toFixed(1) : 0,
        byEndpoint,
        byOperation,
        byUser
      };
    };

    const todayMetrics = calculateMetrics(todaySnapshot.docs);
    const monthMetrics = calculateMetrics(monthSnapshot.docs);
    const last30DaysMetrics = calculateMetrics(last30DaysSnapshot.docs);
    const totalMetrics = calculateMetrics(totalSnapshot.docs);

    // Costo estimado (Haiku: $0.25/1M input, $1.25/1M output)
    const calculateCost = (metrics) => {
      const inputCost = (metrics.totalTokensInput / 1000000) * 0.25;
      const outputCost = (metrics.totalTokensOutput / 1000000) * 1.25;
      return (inputCost + outputCost).toFixed(4);
    };

    return {
      today: {
        ...todayMetrics,
        estimatedCost: calculateCost(todayMetrics)
      },
      currentMonth: {
        ...monthMetrics,
        estimatedCost: calculateCost(monthMetrics)
      },
      last30Days: {
        ...last30DaysMetrics,
        estimatedCost: calculateCost(last30DaysMetrics)
      },
      allTime: {
        ...totalMetrics,
        estimatedCost: calculateCost(totalMetrics)
      },
      generatedAt: now.toISOString()
    };
  } catch (error) {
    console.error('[ClaudeUsage] Error obteniendo estadísticas:', error.message);
    throw error;
  }
};

/**
 * Obtener uso por usuario (top consumidores)
 * @param {number} limit - Número máximo de usuarios a devolver
 * @returns {Promise<Array>} Top usuarios
 */
const getTopUsers = async (limit = 20) => {
  const db = getDb();

  try {
    const snapshot = await db.collection('claudeUsage').get();

    const userMap = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId || 'anonymous';
      const userEmail = data.userEmail || 'No autenticado';

      if (!userMap[userId]) {
        userMap[userId] = {
          userId,
          email: userEmail,
          totalCalls: 0,
          totalTokens: 0,
          lastUsed: null,
          endpoints: {}
        };
      }

      userMap[userId].totalCalls++;
      userMap[userId].totalTokens += (data.tokensInput || 0) + (data.tokensOutput || 0);

      // Actualizar última vez usado
      if (data.timestamp) {
        const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        if (!userMap[userId].lastUsed || timestamp > userMap[userId].lastUsed) {
          userMap[userId].lastUsed = timestamp;
        }
      }

      // Contar por endpoint
      const endpoint = data.endpoint || 'unknown';
      userMap[userId].endpoints[endpoint] = (userMap[userId].endpoints[endpoint] || 0) + 1;
    });

    // Convertir a array y ordenar por tokens
    const users = Object.values(userMap)
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .slice(0, limit)
      .map(user => ({
        ...user,
        lastUsed: user.lastUsed ? user.lastUsed.toISOString() : null,
        estimatedCost: ((user.totalTokens / 1000000) * 0.75).toFixed(4) // Promedio entre input y output
      }));

    return users;
  } catch (error) {
    console.error('[ClaudeUsage] Error obteniendo top usuarios:', error.message);
    throw error;
  }
};

/**
 * Obtener historial diario de uso (últimos N días)
 * @param {number} days - Número de días
 * @returns {Promise<Array>} Historial diario
 */
const getDailyHistory = async (days = 30) => {
  const db = getDb();
  const now = new Date();

  // Generar lista de fechas
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  const startDate = dates[0];

  try {
    const snapshot = await db.collection('claudeUsage')
      .where('date', '>=', startDate)
      .get();

    // Agrupar por fecha
    const dailyMap = {};
    dates.forEach(date => {
      dailyMap[date] = { date, calls: 0, tokens: 0, errors: 0 };
    });

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = data.date;
      if (dailyMap[date]) {
        dailyMap[date].calls++;
        dailyMap[date].tokens += (data.tokensInput || 0) + (data.tokensOutput || 0);
        if (!data.success) {
          dailyMap[date].errors++;
        }
      }
    });

    return Object.values(dailyMap);
  } catch (error) {
    console.error('[ClaudeUsage] Error obteniendo historial diario:', error.message);
    throw error;
  }
};

/**
 * Obtener llamadas recientes
 * @param {number} limit - Número de llamadas a devolver
 * @returns {Promise<Array>} Llamadas recientes
 */
const getRecentCalls = async (limit = 50) => {
  const db = getDb();

  try {
    const snapshot = await db.collection('claudeUsage')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || null
      };
    });
  } catch (error) {
    console.error('[ClaudeUsage] Error obteniendo llamadas recientes:', error.message);
    throw error;
  }
};

/**
 * Rate limiter simple basado en memoria
 * Limita llamadas por IP
 */
const rateLimitStore = new Map();

/**
 * Verificar y aplicar rate limit
 * @param {string} ip - Dirección IP
 * @param {number} maxCalls - Máximo de llamadas permitidas
 * @param {number} windowMs - Ventana de tiempo en milisegundos
 * @returns {Object} { allowed: boolean, remaining: number, resetIn: number }
 */
const checkRateLimit = (ip, maxCalls = 2, windowMs = 60000) => {
  const now = Date.now();
  const key = `claude:${ip}`;

  let record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // Nueva ventana
    record = {
      count: 0,
      resetAt: now + windowMs
    };
  }

  const remaining = maxCalls - record.count;
  const resetIn = Math.max(0, record.resetAt - now);

  if (record.count >= maxCalls) {
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      message: `Rate limit excedido. Intente de nuevo en ${Math.ceil(resetIn / 1000)} segundos.`
    };
  }

  // Incrementar contador
  record.count++;
  rateLimitStore.set(key, record);

  return {
    allowed: true,
    remaining: remaining - 1,
    resetIn
  };
};

/**
 * Limpiar entradas antiguas del rate limiter (llamar periódicamente)
 */
const cleanupRateLimiter = () => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
};

// Limpiar cada 5 minutos
setInterval(cleanupRateLimiter, 5 * 60 * 1000);

module.exports = {
  trackClaudeUsage,
  getUsageStats,
  getTopUsers,
  getDailyHistory,
  getRecentCalls,
  checkRateLimit
};
