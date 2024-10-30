const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const imageController = require('../controllers/imageController');

// 添加路由級別日誌中間件
const routeLogger = (req, res, next) => {
  console.log('🛣️ Image Route:', {
    path: req.path,
    method: req.method,
    params: req.params,
    query: req.query,
    body: req.body
  });
  next();
};

router.use(routeLogger);

// 配置 multer 存儲
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// 文件過濾器
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.tar', '.gz', '.tgz'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only .tar, .gz, and .tgz files are allowed'));
  }
};

// 配置 multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1000, // 1GB
    files: 1
  }
});

// 修改錯誤處理中間件
const handleErrors = (err, req, res, next) => {
  console.error('🚨 Image Route Error:', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack
  });
  
  if (err instanceof multer.MulterError) {
    console.log('📁 Multer Error:', err.code);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
};

// 路由
router.get('/', authenticateToken, imageController.getImages);
router.get('/:id', authenticateToken, imageController.getImageDetails);
router.post('/upload', 
  authenticateToken, 
  upload.single('image'),
  handleErrors,
  imageController.uploadImage
);
router.delete('/:id', authenticateToken, imageController.deleteImage);
router.post('/:id/install', authenticateToken, imageController.installImage);

module.exports = router; 