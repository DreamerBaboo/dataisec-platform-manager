const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticateToken } = require('../middleware/auth');

// 確保所有控制器函數都存在且正確導出
console.log('Available metrics controller functions:', Object.keys(metricsController));

// 系統指標路由
router.get('/system', authenticateToken, metricsController.getClusterMetrics);
router.get('/system/node/:nodeName', authenticateToken, metricsController.getNodeMetrics);

// 節點列表路由
router.get('/nodes', authenticateToken, metricsController.getNodes);

// Pod 指標路由
router.get('/pods', authenticateToken, metricsController.getPodMetrics);

// 導出路由
module.exports = router;
