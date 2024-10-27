// models/user.js

const mongoose = require('mongoose');

// 定義用戶模式
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  // 其他用戶字段
});

// 創建用戶模型
const User = mongoose.model('User', userSchema);

module.exports = User;
