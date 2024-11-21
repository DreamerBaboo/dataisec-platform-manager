const dockerService = require('../services/dockerService');
const multer = require('multer');
const path = require('path');
const os = require('os');

// 配置 multer 用於處理檔案上傳
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 1024 * 1024 * 1024 // 限制 1GB
  }
});

// 獲取倉庫列表
const getRepositories = async (req, res) => {
  try {
    const repositories = await dockerService.listRepositories();
    res.json(repositories);
  } catch (error) {
    console.error('Error getting repositories:', error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取標籤列表
const getTags = async (req, res) => {
  try {
    const { repository } = req.params;
    if (!repository) {
      return res.status(400).json({ error: 'Repository parameter is required' });
    }
    const tags = await dockerService.listTags(repository);
    res.json(tags);
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: error.message });
  }
};

const saveImage = async (req, res) => {
  try {
    const { imageName } = req.query;
    if (!imageName) {
      return res.status(400).json({ error: 'Image name is required' });
    }

    const result = await dockerService.saveImage(imageName);
    
    // 設置檔案下載 header
    res.download(result.filePath, result.fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }
      // 清理臨時檔案
      fs.unlink(result.filePath).catch(console.error);
    });
  } catch (error) {
    console.error('Error saving image:', error);
    res.status(500).json({ error: error.message });
  }
};

const loadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await dockerService.loadImage(req.file.path);
    res.json({ message: 'Image loaded successfully', result });
  } catch (error) {
    console.error('Error loading image:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getRepositories,
  getTags,
  saveImage,
  loadImage,
  upload
}; 