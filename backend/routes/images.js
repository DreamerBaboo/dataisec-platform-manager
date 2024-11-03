const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const imageController = require('../controllers/imageController');
const jwt = require('jsonwebtoken');
const fs = require('fs');

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

// 確保上傳目錄存在
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('📁 Created upload directory:', UPLOAD_DIR);
}

// 配置 multer 存儲
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📁 Using upload directory:', UPLOAD_DIR);
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log('📝 Generated filename:', filename);
    cb(null, filename);
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
    fileSize: 1024 * 1024 * 10000, // 10GB
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
router.get('/repositories', authenticateToken, imageController.getRepositories);
router.get('/tags', authenticateToken, imageController.getTags);
router.get('/', authenticateToken, imageController.getImages);
router.get('/:name/:tag?', authenticateToken, imageController.getImageDetails);
router.post('/upload', authenticateToken, upload.single('image'), handleErrors, imageController.uploadImage);
router.post('/extract', authenticateToken, imageController.extractImages);
router.post('/load', authenticateToken, imageController.loadImages);
router.post('/retag', authenticateToken, imageController.retagImages);
router.post('/delete', authenticateToken, imageController.deleteImage);
router.post('/package', authenticateToken, imageController.packageImages);

// 錯誤處理中間件
router.use((err, req, res, next) => {
  console.error('❌ Route Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message
  });
});

module.exports = router; 