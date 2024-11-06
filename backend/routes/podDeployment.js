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

// Add template routes
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

// Add template upload route
router.post('/templates/upload', authenticateToken, async (req, res) => {
  try {
    console.log('📤 Uploading template');
    await podDeploymentController.uploadTemplate(req, res);
  } catch (error) {
    console.error('❌ Error in template upload route:', error);
    res.status(500).json({
      message: 'Failed to upload template',
      error: error.message
    });
  }
});

// Add template configuration route
router.get('/templates/:deploymentName/config', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting template configuration');
    await podDeploymentController.getTemplateConfig(req, res);
  } catch (error) {
    console.error('❌ Error in template config route:', error);
    res.status(500).json({
      message: 'Failed to get template configuration',
      error: error.message
    });
  }
});

// Add template content save route
router.put('/templates/:deploymentName/template', authenticateToken, async (req, res) => {
  try {
    console.log('💾 Saving template content');
    await podDeploymentController.saveTemplateContent(req, res);
  } catch (error) {
    console.error('❌ Error in template save route:', error);
    res.status(500).json({
      message: 'Failed to save template content',
      error: error.message
    });
  }
});

module.exports = router; 