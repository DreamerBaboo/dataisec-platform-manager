const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });
  try {
    if (username === 'testuser' && password === 'testpassword') {
      const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log('Login successful:', { username, token });
      res.json({ token, user: { username } });
    } else {
      console.log('Login failed: Invalid credentials');
      res.status(401).json({ message: '無效的用戶名或密碼' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '登錄過程中發生錯誤' });
  }
};

exports.getUser = (req, res) => {
  console.log('Get user info:', req.user);
  res.json({ user: req.user });
};

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Authenticating token:', token);

  if (token == null) {
    console.log('Authentication failed: No token provided');
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Authentication failed: Invalid token');
      return res.sendStatus(403);
    }
    console.log('Authentication successful:', user);
    req.user = user;
    next();
  });
};
