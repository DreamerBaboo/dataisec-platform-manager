const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { authenticateToken } = require('../middleware/auth');

// 添加路由級別日誌中間件
const routeLogger = (req, res, next) => {
  console.log('🛣️ Image Route:', {
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });
  next();
};

// 套用全域中間件
router.use(routeLogger);
router.use(authenticateToken);

// 確保所有控制器方法都存在且正確導出
router.get('/repositories', imageController.listRepositories);
router.get('/tags/:repository', imageController.listTags);
router.get('/', imageController.listImages);
router.get('/details/:imageName', imageController.getImageDetails);

// POST 路由
router.post('/upload', 
  imageController.upload.single('image'), 
  imageController.uploadImage
);
router.post('/pull', imageController.pullImage);
router.post('/tag', imageController.tagImage);
router.post('/push', imageController.pushImage);
router.delete('/:imageId', imageController.removeImage);
router.get('/search', imageController.searchImages);
router.post('/save', imageController.saveImage);
router.post('/load', imageController.loadImage);

// 錯誤處理中間件
router.use((err, req, res, next) => {
  console.error('❌ Route Error:', err);
  res.status(500).json({
    error: '內部伺服器錯誤',
    message: err.message
  });
});

module.exports = router; 