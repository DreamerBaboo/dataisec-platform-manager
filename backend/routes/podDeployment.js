const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const podDeploymentController = require('../controllers/podDeploymentController');

// Pod Deployment 路由
router.post('/preview', authenticateToken, podDeploymentController.generatePreview);
router.post('/', authenticateToken, podDeploymentController.createDeployment);
router.get('/', authenticateToken, podDeploymentController.listDeployments);
router.get('/:name', authenticateToken, podDeploymentController.getDeployment);
router.delete('/:name', authenticateToken, podDeploymentController.deleteDeployment);

// 新增日誌和狀態相關路由
router.get('/logs', authenticateToken, podDeploymentController.getDeploymentLogs);
router.get('/:name/containers', authenticateToken, podDeploymentController.getContainers);
router.get('/:name/status', authenticateToken, podDeploymentController.getDeploymentStatus);

module.exports = router; 