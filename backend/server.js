require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./utils/opensearchClient');

const authRoutes = require('./routes/auth');
const metricsRoutes = require('./routes/metrics');
const podRoutes = require('./routes/pods');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 初始化 OpenSearch 連接
const initializeOpenSearch = async () => {
  try {
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to OpenSearch');
    }
    console.log('OpenSearch initialization completed');
  } catch (error) {
    console.error('OpenSearch initialization failed:', error);
    process.exit(1);
  }
};

// 路由
app.use('/api', authRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/pods', podRoutes);

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 啟動服務器
const startServer = async () => {
  try {
    await initializeOpenSearch();
    app.listen(port, () => {
      console.log(`服務器運行在 http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

startServer();
