require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const metricsRoutes = require('./routes/metrics');
const podRoutes = require('./routes/pods');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 路由
app.use('/api', authRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/pods', podRoutes);

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`服務器運行在 http://localhost:${port}`);
});
