const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 登錄路由
router.post('/login', (req, res, next) => {
  console.log('👉 Login route accessed:', {
    body: req.body,
    headers: req.headers
  });
  authController.login(req, res, next);
});

// 獲取用戶信息路由
router.get('/user', authController.authenticateToken, (req, res) => {
  console.log('👉 Get user route accessed:', {
    user: req.user
  });
  authController.getUser(req, res);
});

module.exports = router;
