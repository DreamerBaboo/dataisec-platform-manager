const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const podDeploymentController = require('../controllers/podDeploymentController');
const path = require('path');
const fs = require('fs').promises;

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

// Save deployment configuration
router.post('/config', authenticateToken, podDeploymentController.saveDeploymentConfig);

// Get deployment versions
router.get('/:name/versions', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    console.log('🔍 Getting versions for deployment:', name);

    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');
    console.log('📂 Config path:', configPath);

    // Check if config file exists
    const exists = await fs.access(configPath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.log('❌ Config file not found');
      return res.status(404).json({
        error: 'Deployment configuration not found',
        details: `No config.json found for deployment: ${name}`
      });
    }

    const configFile = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);

    const versions = Object.keys(config.versions).map(version => ({
      version,
      createdAt: config.versions[version].createdAt,
      updatedAt: config.versions[version].updatedAt
    }));

    console.log('✅ Found versions:', versions);
    res.json({
      name,
      versions,
      latestVersion: config.latestVersion
    });
  } catch (error) {
    console.error('❌ Failed to get deployment versions:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({
        error: 'Deployment not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to get deployment versions',
        details: error.message
      });
    }
  }
});

// Get specific version configuration
router.get('/:name/versions/:version', authenticateToken, async (req, res) => {
  try {
    const { name, version } = req.params;
    console.log('🔍 Getting config for deployment:', name, 'version:', version);

    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');
    console.log('📂 Config path:', configPath);

    const configFile = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);

    if (!config.versions[version]) {
      console.log('❌ Version not found:', version);
      return res.status(404).json({
        error: 'Version not found',
        details: `Version ${version} not found for deployment ${name}`
      });
    }

    console.log('✅ Found configuration for version:', version);
    res.json(config.versions[version]);
  } catch (error) {
    console.error('❌ Failed to get version config:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({
        error: 'Deployment or version not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to get version configuration',
        details: error.message
      });
    }
  }
});

module.exports = router; 