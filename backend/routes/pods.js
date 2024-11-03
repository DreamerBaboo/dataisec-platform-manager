const express = require('express');
const router = express.Router();
const podService = require('../services/podService');
const { authenticateToken } = require('../middleware/auth');

// 獲取所有命名空間
router.get('/namespaces', authenticateToken, async (req, res) => {
  try {
    const namespaces = await podService.getNamespaces();
    res.json(namespaces);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

module.exports = router;
