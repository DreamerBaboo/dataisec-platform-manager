const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 登錄路由
router.post('/login', (req, res, next) => {
  console.log('Login route accessed');
  authController.login(req, res, next);
});

// 獲取用戶信息路由
router.get('/user', (req, res, next) => {
  console.log('Get user route accessed');
  authController.authenticateToken(req, res, () => {
    authController.getUser(req, res, next);
  });
});

module.exports = router;
