const express = require('express');
const router = express.Router();
const podController = require('../controllers/podController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// 配置文件上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // 確保這個目錄存在
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// Pod 列表和操作路由
router.get('/', authenticateToken, podController.getPods);
router.get('/:id', authenticateToken, podController.getPodById);
router.post('/', authenticateToken, podController.createPod);
router.put('/:id', authenticateToken, podController.updatePod);
router.delete('/', authenticateToken, podController.deletePods);

// 鏡像上傳路由
router.post('/upload-image', authenticateToken, upload.single('image'), podController.uploadImage);

module.exports = router;
