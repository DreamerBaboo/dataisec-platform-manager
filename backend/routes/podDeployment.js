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

// Add template listing route
router.get('/templates/list', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting template list');
    await podDeploymentController.getTemplateList(req, res);
  } catch (error) {
    console.error('❌ Error in template list route:', error);
    res.status(500).json({
      message: 'Failed to get template list',
      error: error.message
    });
  }
});

module.exports = router; 