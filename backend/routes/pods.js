const express = require('express');
const router = express.Router();
const podController = require('../controllers/podController');
const { authenticateToken } = require('../middleware/auth');

router.get('/namespaces', authenticateToken, podController.getNamespaces);
router.get('/metrics/:podName', authenticateToken, podController.getPodMetrics);
router.get('/', authenticateToken, podController.getPods);
router.post('/calculate-resources', authenticateToken, podController.calculateSelectedPodsResources);

module.exports = router;
