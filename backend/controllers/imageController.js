const containerRuntime = require('../utils/container-runtime');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const multer = require('multer');
const logger = require('../utils/logger');
const dockerService = require('../services/dockerService');

// 確保上傳目錄存在
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  logger.info('📁 Created upload directory:', UPLOAD_DIR);
}

// 修改 multer 配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    logger.info('📁 Using upload directory:', UPLOAD_DIR);
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
    logger.info('📝 Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10000, // 10GB
    files: 1
  }
});

// 檢查權限函數
const checkDockerPermissions = async () => {
  try {
    logger.info('🔍 Checking container runtime permissions...');
    await containerRuntime.listContainers();
    logger.info('✅ Container runtime permissions verified');
    return true;
  } catch (error) {
    logger.error('❌ Container runtime permission check failed:', error.message);
    if (error.message.includes('permission denied')) {
      throw new Error('No permission to execute container commands. Please check your permissions.');
    } else if (error.message.includes('Cannot connect')) {
      throw new Error('Cannot connect to container runtime. Please ensure the service is running.');
    }
    throw error;
  }
};

// 獲取所有鏡像
const getImages = async (req, res) => {
  logger.info('🔍 Getting all images');
  try {
    const images = await containerRuntime.listImages();
    logger.info('📦 Raw images data:', images);

    if (!images || images.length === 0) {
      logger.info('ℹ️ No images found');
      return res.json([]);
    }

    // 轉換為前端需要的格式
    const formattedImages = images.map(image => ({
      id: image.ID,
      name: image.REPO,
      tag: image.TAG,
      size: image.SIZE,
      createdAt: image.CREATED,
      status: 'available'
    }));

    logger.info('✅ Formatted images list:', formattedImages);
    res.json(formattedImages);
  } catch (error) {
    logger.error('❌ Error getting images:', error);
    res.status(500).json({
      message: 'Failed to get images',
      error: error.message
    });
  }
};

// 獲取映像檔列表
async function listImages(req, res) {
  try {
    const images = await dockerService.listImages();
    res.json(images);
  } catch (error) {
    logger.error('Failed to list images:', error);
    res.status(500).json({ error: '無法獲取映像檔列表' });
  }
}

// 獲取映像檔詳細資訊
async function getImageDetails(req, res) {
  try {
    const { imageName } = req.params;
    const details = await dockerService.inspectImage(imageName);
    res.json(JSON.parse(details));
  } catch (error) {
    logger.error(`Failed to get image details for ${req.params.imageName}:`, error);
    res.status(500).json({ error: '無法獲取映像檔詳細資訊' });
  }
}

// 拉取映像檔
async function pullImage(req, res) {
  try {
    const { imageName } = req.body;
    await dockerService.pullImage(imageName);
    res.json({ message: '映像檔拉取成功' });
  } catch (error) {
    logger.error(`Failed to pull image ${req.body.imageName}:`, error);
    res.status(500).json({ error: '映像檔拉取失敗' });
  }
}

// 刪除映像檔
async function removeImage(req, res) {
  try {
    const { imageId } = req.params;
    await dockerService.removeImage(imageId);
    res.json({ message: '映像檔刪除成功' });
  } catch (error) {
    logger.error(`Failed to remove image ${req.params.imageId}:`, error);
    res.status(500).json({ error: '映像檔刪除失敗' });
  }
}

// 標記映像檔
async function tagImage(req, res) {
  try {
    const { source, target } = req.body;
    await dockerService.tagImage(source, target);
    res.json({ message: '映像檔標記成功' });
  } catch (error) {
    logger.error('Failed to tag image:', error);
    res.status(500).json({ error: '映像檔標記失敗' });
  }
}

// 推送映像檔
async function pushImage(req, res) {
  try {
    const { imageName } = req.body;
    await dockerService.pushImage(imageName);
    res.json({ message: '映像檔推送成功' });
  } catch (error) {
    logger.error(`Failed to push image ${req.body.imageName}:`, error);
    res.status(500).json({ error: '映像檔推送失敗' });
  }
}

// 搜尋映像檔
async function searchImages(req, res) {
  try {
    const { term } = req.query;
    const results = await dockerService.searchImages(term);
    res.json(results);
  } catch (error) {
    logger.error(`Failed to search images with term ${req.query.term}:`, error);
    res.status(500).json({ error: '映像檔搜尋失敗' });
  }
}

// 儲存映像檔
async function saveImage(req, res) {
  try {
    const { imageName } = req.body;
    const result = await dockerService.saveImage(imageName);
    res.json(result);
  } catch (error) {
    logger.error(`Failed to save image ${req.body.imageName}:`, error);
    res.status(500).json({ error: '映像檔儲存失敗' });
  }
}

// 載入映像檔
async function loadImage(req, res) {
  try {
    const { filePath } = req.body;
    await dockerService.loadImage(filePath);
    res.json({ message: '映像檔載入成功' });
  } catch (error) {
    logger.error('Failed to load image:', error);
    res.status(500).json({ error: '映像檔載入失敗' });
  }
}

// 添加上傳映像檔功能
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未找到上傳的檔案' });
    }

    logger.info('📤 Uploading image file:', req.file.originalname);
    
    const filePath = req.file.path;
    const fileName = req.file.filename;

    try {
      await dockerService.loadImage(filePath);
      logger.info('✅ Image loaded successfully:', fileName);
      
      // 清理臨時檔案
      await fs.unlink(filePath);
      logger.info('🧹 Temporary file cleaned up:', filePath);
      
      res.json({
        message: '映像檔上傳成功',
        fileName: fileName
      });
    } catch (error) {
      // 如果載入失敗，也要清理臨時檔案
      try {
        await fs.unlink(filePath);
        logger.info('🧹 Cleaned up temporary file after error:', filePath);
      } catch (cleanupError) {
        logger.error('❌ Failed to cleanup temporary file:', cleanupError);
      }
      
      throw error;
    }
  } catch (error) {
    logger.error('❌ Error uploading image:', error);
    res.status(500).json({
      error: '映像檔上傳失敗',
      details: error.message
    });
  }
}

// 列出映像庫
async function listRepositories(req, res) {
  try {
    const repositories = await dockerService.listRepositories();
    res.json(repositories);
  } catch (error) {
    logger.error('Failed to list repositories:', error);
    res.status(500).json({ error: '無法獲取映像庫列表' });
  }
}

// 列出標籤
async function listTags(req, res) {
  try {
    const { repository } = req.params;
    const tags = await dockerService.listTags(repository);
    res.json(tags);
  } catch (error) {
    logger.error('Failed to list tags:', error);
    res.status(500).json({ error: '無法獲取標籤列表' });
  }
}

module.exports = {
  listImages,
  getImageDetails,
  uploadImage,
  pullImage,
  removeImage,
  tagImage,
  pushImage,
  searchImages,
  saveImage,
  loadImage,
  upload,
  listRepositories,
  listTags
};
