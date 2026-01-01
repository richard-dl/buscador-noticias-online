const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const {
  getUsageStats,
  getTopUsers,
  getDailyHistory,
  getRecentCalls
} = require('../services/claudeUsageService');

/**
 * GET /api/admin/claude-stats
 * Obtener estadísticas generales de uso de Claude
 * Solo admin
 */
router.get('/claude-stats', authenticate, isAdmin, async (req, res) => {
  try {
    const stats = await getUsageStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de Claude:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

/**
 * GET /api/admin/claude-stats/top-users
 * Obtener top usuarios consumidores de Claude
 * Solo admin
 */
router.get('/claude-stats/top-users', authenticate, isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const users = await getTopUsers(limit);
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error obteniendo top usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener top usuarios'
    });
  }
});

/**
 * GET /api/admin/claude-stats/daily
 * Obtener historial diario de uso
 * Solo admin
 */
router.get('/claude-stats/daily', authenticate, isAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const history = await getDailyHistory(days);
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error obteniendo historial diario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener historial'
    });
  }
});

/**
 * GET /api/admin/claude-stats/recent
 * Obtener llamadas recientes a Claude
 * Solo admin
 */
router.get('/claude-stats/recent', authenticate, isAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const calls = await getRecentCalls(limit);
    res.json({
      success: true,
      data: calls
    });
  } catch (error) {
    console.error('Error obteniendo llamadas recientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener llamadas recientes'
    });
  }
});

module.exports = router;
