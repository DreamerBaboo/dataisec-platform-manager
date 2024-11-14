const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dockerController = require('../controllers/dockerController');
const dockerService = require('../services/dockerService');

router.get('/repositories', authenticateToken, dockerController.getRepositories);
router.get('/tags/:repository', authenticateToken, dockerController.getTags);
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { term } = req.query;
    const results = await dockerService.searchImages(term);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 