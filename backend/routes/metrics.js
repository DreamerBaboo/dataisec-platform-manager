const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/system', authenticateToken, metricsController.getSystemMetrics);
router.get('/pods', authenticateToken, metricsController.getPodMetrics);

module.exports = router;
