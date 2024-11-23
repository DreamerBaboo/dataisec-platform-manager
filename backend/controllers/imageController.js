const containerRuntime = require('../utils/container-runtime');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const multer = require('multer');
const logger = require('../utils/logger');
const dockerService = require('../services/dockerService');
const os = require('os');

// 確保上傳目錄存在
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  logger.info('📁 Created upload directory:', UPLOAD_DIR);
}

// 確保臨時目錄存在
const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  logger.info('📁 Created temp directory:', TEMP_DIR);
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

// 配置 multer
const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
    // 確保目錄存在
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    cb(null, TEMP_DIR);
  },
  filename: function (req, file, cb) {
    // 使用 UUID 生成唯一文件名
    const uniqueSuffix = require('uuid').v4();
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload2 = multer({
  storage: storage2,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 50 // 50GB 限制
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

// 打包映像檔
async function packageImages(req, res) {
  let outputPath = null;
  
  try {
    const { images } = req.body;
    
    if (!Array.isArray(images) || images.length === 0) {
      logger.error('無效的請求數據:', req.body);
      return res.status(400).json({
        success: false,
        error: '請提供要打包的映像檔列表'
      });
    }

    logger.info(`開始打包 ${images.length} 個映像檔:`, images);

    // 檢查並創建臨時目錄
    await fsPromises.mkdir(TEMP_DIR, { recursive: true });
    
    // 準備映像名稱列表
    const imageNames = images.map(image => 
      image.fullName || `${image.name}:${image.tag || 'latest'}`
    );
    
    logger.info('準備打包的映像列表:', imageNames);

    // 生成輸出文件路徑
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    outputPath = path.join(TEMP_DIR, `docker-images-${timestamp}.tar`);

    try {
      // 使用 containerRuntime 保存所有映像到單個文件
      await containerRuntime.saveImage(imageNames.join(' '), outputPath);
      
      logger.info('映像檔打包完成，開始檢查文件:', outputPath);
      
      // 驗證文件是否存在且可讀
      const stats = await fsPromises.stat(outputPath);
      if (stats.size === 0) {
        throw new Error('生成的文件大小為0');
      }

      logger.info(`文件大小: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

      // 設置響應頭
      res.setHeader('Content-Type', 'application/x-tar');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(outputPath)}"`);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Transfer-Encoding', 'chunked');
      
      // 使用 stream 發送文件，設置較大的 buffer
      const fileStream = fs.createReadStream(outputPath, {
        highWaterMark: 64 * 1024 // 64KB chunks
      });
      
      // 處理流錯誤
      fileStream.on('error', (error) => {
        logger.error('文件流讀取錯誤:', error);
        cleanup(outputPath);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: '文件傳輸失敗: ' + error.message
          });
        }
      });

      // 監控傳輸進度
      let transferred = 0;
      fileStream.on('data', (chunk) => {
        transferred += chunk.length;
        const progress = ((transferred / stats.size) * 100).toFixed(2);
        logger.debug(`傳輸進度: ${progress}% (${(transferred / (1024 * 1024)).toFixed(2)}MB / ${(stats.size / (1024 * 1024)).toFixed(2)}MB)`);
      });

      // 監聽流結束事件
      fileStream.on('end', () => {
        logger.info('文件傳輸完成');
      });

      // 監聽響應完成事件
      res.on('finish', () => cleanup(outputPath));

      // 處理客戶端斷開連接
      req.on('close', () => {
        if (!res.writableEnded) {
          logger.warn('客戶端斷開連接');
          cleanup(outputPath);
        }
      });

      // 發送文件
      fileStream.pipe(res);

    } catch (error) {
      cleanup(outputPath);
      throw error;
    }

  } catch (error) {
    logger.error('打包映像檔失敗:', error);
    cleanup(outputPath);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: '打包映像檔失敗: ' + error.message
      });
    }
  }
}

// 清理函數
async function cleanup(filePath) {
  if (filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fsPromises.unlink(filePath);
        logger.info('臨時文件清理完成:', filePath);
      }
    } catch (error) {
      logger.error('清理臨時文件失敗:', error);
    }
  }
}

// 刪除映像
async function deleteImages(req, res) {
  try {
    const { images } = req.body;
    
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: '請提供要刪除的映像列表'
      });
    }

    logger.info('開始刪除映像:', images);

    // 準備映像名稱列表
    const imageNames = images.map(image => 
      image || `${image.name}:${image.tag || 'latest'}`
    );
    logger.info('準備刪除的映像列表:', imageNames);
    // 使用 containerRuntime 刪除映像
    const results = await containerRuntime.deleteImage(imageNames);

    // 檢查是否所有操作都成功
    const allSuccess = results.every(result => result.success);
    
    if (allSuccess) {
      res.json({
        success: true,
        message: '所有映像已成功刪除',
        results
      });
    } else {
      // 部分成功或全部失敗
      res.status(207).json({
        success: false,
        message: '部分或全部映像刪除失敗',
        results
      });
    }

  } catch (error) {
    logger.error('刪除映像失敗:', error);
    res.status(500).json({
      success: false,
      error: '刪除映像失敗: ' + error.message
    });
  }
}

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

// 上傳並載入映像
async function uploadAndLoadImage(req, res) {
  let uploadedFile = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '未提供映像檔'
      });
    }

    uploadedFile = req.file.path;
    logger.info('接收到上傳文件:', {
      originalName: req.file.originalname,
      size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      path: uploadedFile
    });

    // 載入映像
    logger.info('開始載入映像...');
    const result = await containerRuntime.loadImage(uploadedFile);
    
    logger.info('映像載入完成:', result);

    // 清理臨時文件
    await cleanup(uploadedFile);
    
    res.json({
      success: true,
      message: '映像上傳並載入成功',
      loadedImages: result.loadedImages
    });

  } catch (error) {
    logger.error('上傳或載入映像失敗:', error);
    
    // 清理臨時文件
    if (uploadedFile) {
      await cleanup(uploadedFile);
    }

    res.status(500).json({
      success: false,
      error: '上傳或載入映像失敗: ' + error.message
    });
  }
}

module.exports = {
  listImages,
  packageImages,
  deleteImages,
  getImageDetails,
  pullImage,
  removeImage,
  tagImage,
  pushImage,
  searchImages,
  saveImage,
  loadImage,
  uploadAndLoadImage,
  upload: upload2,
  uploadImage,
  listRepositories,
  listTags
};
