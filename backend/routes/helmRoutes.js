const express = require('express');
const router = express.Router();
const { executeHelmCommand } = require('../controllers/helmController');

router.post('/execute', executeHelmCommand);

module.exports = router;
