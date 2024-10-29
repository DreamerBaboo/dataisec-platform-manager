const express = require('express');
const router = express.Router();
const podController = require('../controllers/podController');
const { authenticateToken } = require('../middleware/auth');

router.get('/namespaces', authenticateToken, podController.getNamespaces);
router.get('/', authenticateToken, podController.getPods);

module.exports = router;
