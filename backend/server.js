require('dotenv').config();
const { checkRequiredEnvVars } = require('./utils/envCheck');

// 在應用啟動前檢查環境變量
if (!checkRequiredEnvVars()) {
  console.error('❌ Environment variables check failed. Please check your configuration.');
  process.exit(1);
}

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');

const app = express();

// CORS 配置處理函數
function createCorsOptions() {
  return {
    origin: function(origin, callback) {
      // 開發環境允許的域名
      const devOrigins = [
        'http://localhost:3001',
        'http://localhost:5173',
        'http://192.168.125.168:3001',
        'http://192.168.170.126:30002',  // 添加新的允許域名
        'http://192.168.170.126'         // 添加基本域名
      ];
      
      // 從環境變數獲取允許的域名
      const allowedOrigins = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',')
        : [];
      
      // 合併所有允許的域名
      const validOrigins = [
        ...devOrigins,
        ...allowedOrigins
      ];

      // 允許來自相同集群的請求
      const isK8sInternalRequest = !origin || 
        origin.includes('.cluster.local') || 
        origin.includes('.svc.') ||
        /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin);

      if (isK8sInternalRequest || validOrigins.some(valid => origin?.includes(valid))) {
        callback(null, origin); // 修改此行，傳回請求的 origin
      } else {
        console.warn(`⚠️ Blocked CORS request from origin: ${origin}`);
        console.log('Allowed origins:', validOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-Cluster-Client'  // 用於識別集群內部請求
    ],
    exposedHeaders: [
      'Content-Range',
      'X-Content-Range',
      'X-Total-Count'
    ],
    maxAge: 86400 // 24小時
  };
}

// 應用 CORS 中間件
app.use(cors(createCorsOptions()));

// 記錄 CORS 請求
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 CORS Request: ${req.method} ${req.url}`);
    console.log('Origin:', req.headers.origin);
    console.log('Headers:', req.headers);
  }
  next();
});

app.use(bodyParser.json());

// Import routes
const authRouter = require('./routes/auth');
const metricsRouter = require('./routes/metrics');
const podsRouter = require('./routes/pods');
const imagesRouter = require('./routes/images');
const podDeploymentRouter = require('./routes/podDeployment');
const deploymentTemplatesRouter = require('./routes/deploymentTemplates');
const dockerRouter = require('./routes/docker');
const k8sRouter = require('./routes/k8s');
const helmRouter = require('./routes/helmRoutes');
const commandRoutes = require('./routes/commandRoutes');

// API routes
app.use('/api/auth', authRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/pods', podsRouter);
app.use('/api/images', imagesRouter);
app.use('/api/pod-deployments', podDeploymentRouter);
app.use('/api/deployment-templates', deploymentTemplatesRouter);
app.use('/api/docker', dockerRouter);
app.use('/api/k8s', k8sRouter);
app.use('/api/helm', helmRouter);
app.use('/api', commandRoutes);

// 使用中間件解析 JSON 請求
app.use(express.json());

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
  
  // 確保目錄存在
  if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath, { recursive: true });
  }

  // 設定靜態檔案服務
  app.use(express.static(publicPath));

  // 所有請求都返回 index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;

// 創建 HTTP 服務器
const server = http.createServer(app);

// 創建 WebSocket 服務器
const wss = new WebSocket.Server({ server });

// WebSocket 路由處理
wss.on('connection', (ws, req) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  
  if (pathname.startsWith('/api/pod-deployments/')) {
    const matches = pathname.match(/\/api\/pod-deployments\/([^\/]+)\/progress/);
    if (matches) {
      const name = matches[1];
      podDeploymentController.handleDeploymentProgress(ws, { 
        ...req, 
        params: { name } 
      });
    }
  }
});

// 使用 server 而不是 app 來監聽
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('📦 Static files path:', path.join(__dirname, 'public'));
  }
});

module.exports = app;
