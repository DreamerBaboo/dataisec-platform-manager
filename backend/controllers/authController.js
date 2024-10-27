const jwt = require('jsonwebtoken');

// 移除 bcrypt 和 User 模型的引入，因為我們不再使用數據庫

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    // 使用硬編碼的用戶名和密碼進行驗證
    if (username === 'testuser' && password === 'testpassword') {
      const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user: { username } });
    } else {
      res.status(401).json({ message: '無效的用戶名或密碼' });
    }
  } catch (error) {
    console.error('登錄錯誤:', error);
    res.status(500).json({ message: '登錄過程中發生錯誤' });
  }
};

exports.getUser = (req, res) => {
  res.json({ user: req.user });
};

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
