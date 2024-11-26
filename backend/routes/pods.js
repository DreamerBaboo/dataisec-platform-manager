const express = require('express');
const router = express.Router();
const podService = require('../services/podService');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger'); 

// 獲取所有命名空間
router.get('/namespaces', authenticateToken, async (req, res) => {
  try {
    logger.info('Getting namespaces...');
    const result = await podService.getNamespaces();
    
    if (!result || !result.namespaces) {
      logger.info('Invalid result from podService:', result);
      return res.status(500).json({ 
        error: 'Failed to get namespaces',
        details: 'Invalid response structure'
      });
    }

    logger.info('Successfully retrieved namespaces:', result);
    res.json(result);
  } catch (error) {
    logger.info('Error getting namespaces:', error);
    res.status(500).json({ 
      error: 'Failed to get namespaces',
      message: error.message,
      details: error.response?.body || error.stack
    });
  }
});

// 獲取 Pod 列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { namespace, search } = req.query;
    logger.info('Getting pods with filters:', { namespace, search });
    
    const pods = await podService.getPods(namespace, search);
    res.json(pods);
  } catch (error) {
    logger.error('Error getting pods:', error);
    res.status(500).json({ 
      error: 'Failed to get pods',
      message: error.message,
      details: error.response?.body || error.stack
    });
  }
});

// 刪除 Pod
router.delete('/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace } = req.query;
    await podService.deletePod(name, namespace);
    res.json({ message: 'Pod deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add resource calculation endpoint
router.post('/calculate-resources', authenticateToken, async (req, res) => {
  try {
    const { podName, namespace } = req.body;
    
    if (!podName || !namespace) {
      logger.info('Missing required parameters:', { podName, namespace });
      return res.status(400).json({ 
        error: 'Pod name and namespace are required',
        received: { podName, namespace }
      });
    }

    console.log('Calculating resources for:', { podName, namespace });
    const resources = await podService.calculatePodResources(podName, namespace);
    
    console.log('Resources calculated:', resources);
    res.json(resources);
  } catch (error) {
    logger.info('Failed to calculate pod resources:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add pod metrics endpoint
router.get('/:name/metrics', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { namespace } = req.query;
    
    if (!name || !namespace) {
      return res.status(400).json({ 
        error: 'Pod name and namespace are required' 
      });
    }

    const metrics = await podService.getPodMetrics(name, namespace);
    res.json(metrics);
  } catch (error) {
    logger.info('Failed to get pod metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
