// 添加全局錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('🚨 Global Error:', {
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

// 添加請求日誌中間件
app.use((req, res, next) => {
  console.log('📥 Incoming Request:', {
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  next();
}); 