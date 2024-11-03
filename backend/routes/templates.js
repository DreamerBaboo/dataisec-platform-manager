const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const templateController = require('../controllers/templateController');

router.post('/', authenticateToken, templateController.saveTemplate);
router.put('/:templateId', authenticateToken, templateController.updateTemplate);
router.get('/:templateId/history', authenticateToken, templateController.getTemplateHistory);
router.get('/category', authenticateToken, templateController.getTemplatesByCategory);
router.get('/:templateId/export', authenticateToken, templateController.exportTemplate);
router.post('/import', authenticateToken, templateController.importTemplate);

module.exports = router; 