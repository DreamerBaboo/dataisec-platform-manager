const express = require('express');
const router = express.Router();
const podService = require('../services/podService');
const { authenticateToken } = require('../middleware/auth');

// 獲取所有命名空間
router.get('/namespaces', authenticateToken, async (req, res) => {
  try {
    console.log('Getting namespaces...');
    const result = await podService.getNamespaces();
    
    if (!result || !result.namespaces) {
      console.error('Invalid result from podService:', result);
      return res.status(500).json({ 
        error: 'Failed to get namespaces',
        details: 'Invalid response structure'
      });
    }

    console.log('Successfully retrieved namespaces:', result);
    res.json(result);
  } catch (error) {
    console.error('Error getting namespaces:', error);
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
    const { namespace } = req.query;
    const pods = await podService.getPods(namespace);
    res.json(pods);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      console.log('Missing required parameters:', { podName, namespace });
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
    console.error('Failed to calculate pod resources:', error);
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
    console.error('Failed to get pod metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
