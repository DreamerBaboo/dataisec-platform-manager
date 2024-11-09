const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const k8sService = require('../services/k8sService');

// 獲取節點列表
router.get('/nodes', authenticateToken, async (req, res) => {
  try {
    console.log('Getting nodes list');
    const nodes = await k8sService.getNodes();
    res.json(nodes);
  } catch (error) {
    console.error('Failed to get nodes:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取 StorageClass 列表
router.get('/storage/classes', authenticateToken, async (req, res) => {
  try {
    console.log('Getting storage classes');
    const storageClasses = await k8sService.listStorageClasses();
    res.json(storageClasses);
  } catch (error) {
    console.error('Failed to get storage classes:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取 PersistentVolume 列表
router.get('/storage/persistent-volumes', authenticateToken, async (req, res) => {
  try {
    console.log('Getting persistent volumes');
    const { namespace } = req.query;
    const persistentVolumes = await k8sService.listPersistentVolumes(namespace);
    res.json(persistentVolumes);
  } catch (error) {
    console.error('Failed to get persistent volumes:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 