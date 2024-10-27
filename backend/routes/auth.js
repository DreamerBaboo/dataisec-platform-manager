const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 登錄路由
router.post('/login', authController.login);

// 獲取用戶信息路由
router.get('/user', authController.authenticateToken, authController.getUser);

module.exports = router;
