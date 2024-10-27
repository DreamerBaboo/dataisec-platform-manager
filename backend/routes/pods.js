const express = require('express');
const router = express.Router();
const podController = require('../controllers/podController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, podController.getPods);
router.post('/', authenticateToken, podController.createPod);

module.exports = router;
