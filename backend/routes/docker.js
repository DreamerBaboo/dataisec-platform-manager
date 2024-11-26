const express = require('express');
const router = express.Router();
const os = require('os');
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

// 保存映像
router.get('/save', 
  authenticateToken, 
  dockerController.saveImage
);

// 加載映像
router.post('/load',
  authenticateToken,
  dockerController.upload.single('imageFile'),
  dockerController.loadImage
);

module.exports = router; 