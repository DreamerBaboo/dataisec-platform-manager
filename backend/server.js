// First require dotenv
const dotenv = require('dotenv');
// Then load environment variables
dotenv.config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:5173',
  credentials: true
}));

app.use(bodyParser.json());

// Import routes
const authRouter = require('./routes/auth');
const metricsRouter = require('./routes/metrics');
const podsRouter = require('./routes/pods');
const imagesRouter = require('./routes/images');

// API routes
app.use('/api/auth', authRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/pods', podsRouter);
app.use('/api/images', imagesRouter);

// 添加錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('🚨 API Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({
    message: 'Internal server error',
    error: err.message
  });
});

// 請求日誌中間件
app.use((req, res, next) => {
  console.log('📥 API Request:', {
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    headers: req.headers
  });
  next();
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, 'public');
  const indexPath = path.join(publicPath, 'index.html');
  
  console.log('📂 Public directory path:', publicPath);
  console.log('📄 Index file path:', indexPath);
  console.log('📁 Public directory contents:', fs.readdirSync(publicPath));
  
  // Serve frontend static files
  app.use(express.static(publicPath));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res, next) => {
    console.log('🔍 Requested URL:', req.url);
    if (req.url.startsWith('/api')) {
      return next();
    }
    
    try {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error('❌ index.html not found at:', indexPath);
        res.status(404).send('index.html not found');
      }
    } catch (error) {
      console.error('❌ Error serving index.html:', error);
      res.status(500).send('Error serving index.html');
    }
  });
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('📦 Static files path:', path.join(__dirname, 'public'));
  }
});

module.exports = app;
