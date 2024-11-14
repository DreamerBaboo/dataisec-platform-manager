const express = require('express');
const router = express.Router();
const { getCommands, executeCommand } = require('../controllers/commandController');

router.get('/commands', getCommands);
router.post('/execute', executeCommand);

module.exports = router;
