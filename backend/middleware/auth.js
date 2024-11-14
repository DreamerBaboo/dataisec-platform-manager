const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  console.log('🔐 Checking authentication...');
  const authHeader = req.headers['authorization'];
  console.log('🔑 Auth header:', authHeader);

  if (!authHeader) {
    console.log('❌ No auth header found');
    return res.status(401).json({
      error: 'Authentication required',
      details: 'No authorization header found'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.log('❌ No token found in auth header');
    return res.status(401).json({
      error: 'Authentication required',
      details: 'No token found in authorization header'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified for user:', decoded.username);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(403).json({
      error: 'Invalid token',
      details: error.message
    });
  }
};

module.exports = { authenticateToken };
