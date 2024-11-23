const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// 添加路由級別日誌中間件
const routeLogger = (req, res, next) => {
  console.log('🛣️ Image Route:', {
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    body: req.body,
    query: req.query
  });
  next();
};

// 套用全域中間件
router.use(routeLogger);
router.use(authenticateToken);

// 基本映像操作路由
router.get('/list', imageController.listImages);
router.get('/repositories', imageController.listRepositories);
router.get('/tags/:repository', imageController.listTags);

// 映像管理路由
router.post('/save', imageController.saveImage);
router.post('/load', imageController.loadImage);
router.post('/package', imageController.packageImages);
router.delete('/delete', imageController.deleteImages);  
router.post('/upload', imageController.upload.single('file'), imageController.uploadAndLoadImage);

// POST 路由
router.post('/pull', imageController.pullImage);
router.post('/tag', imageController.tagImage);
router.post('/push', imageController.pushImage);
router.get('/search', imageController.searchImages);

// 錯誤處理中間件
router.use((err, req, res, next) => {
  console.error('❌ Route Error:', err);
  
  // 處理 multer 錯誤
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: '文件太大，超過限制'
      });
    }
    return res.status(400).json({
      success: false,
      error: '文件上傳錯誤: ' + err.message
    });
  }
  
  res.status(500).json({
    success: false,
    error: '服務器錯誤: ' + err.message
  });
});

module.exports = router;
