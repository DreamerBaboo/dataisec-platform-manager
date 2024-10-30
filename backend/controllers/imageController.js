const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const execPromise = util.promisify(exec);

// 日誌記錄函數
const logError = (error, operation) => {
  console.error(`Error during ${operation}:`, error);
  // 這裡可以添加更多的日誌記錄邏輯，比如寫入文件或發送到日誌服務
};

// 獲取所有鏡像
const getImages = async (req, res) => {
  console.log('🔍 Getting all images');
  try {
    console.log('🐳 Executing docker images command...');
    const { stdout } = await execPromise('docker images --format "{{json .}}"');
    console.log('📦 Raw docker output:', stdout);

    if (!stdout.trim()) {
      console.log('ℹ️ No images found');
      return res.json([]);
    }

    const images = stdout
      .trim()
      .split('\n')
      .filter(line => {
        console.log('🔄 Processing line:', line);
        return line;
      })
      .map(line => {
        try {
          console.log('📝 Parsing JSON line:', line);
          const image = JSON.parse(line);
          return {
            id: image.ID,
            name: image.Repository,
            tag: image.Tag,
            size: image.Size,
            createdAt: image.CreatedAt,
            status: 'available'
          };
        } catch (err) {
          console.error('❌ Error parsing line:', err);
          return null;
        }
      })
      .filter(image => image !== null);

    console.log('✅ Final images list:', images);
    res.json(images);
  } catch (error) {
    console.error('❌ Error in getImages:', error);
    res.status(500).json({ 
      message: 'Failed to fetch images',
      error: error.message 
    });
  }
};


// 獲取鏡像詳情
const getImageDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Image ID is required' });
    }

    const { stdout } = await execPromise(`docker inspect ${id}`);
    const details = JSON.parse(stdout)[0];

    if (!details) {
      return res.status(404).json({ message: 'Image not found' });
    }

    res.json({
      id: details.Id,
      name: details.RepoTags?.[0]?.split(':')[0] || 'unknown',
      tag: details.RepoTags?.[0]?.split(':')[1] || 'unknown',
      size: details.Size,
      createdAt: details.Created,
      status: 'available',
      details: {
        architecture: details.Architecture,
        os: details.Os,
        layers: details.RootFS?.Layers || [],
        author: details.Author,
        config: details.Config,
        history: details.History
      }
    });
  } catch (error) {
    logError(error, 'fetching image details');
    res.status(500).json({ 
      message: 'Failed to fetch image details', 
      error: error.message 
    });
  }
};

// 上傳新鏡像
const uploadImage = async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // 驗證文件類型
    const validTypes = ['.tar', '.gz', '.tgz'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!validTypes.includes(ext)) {
      await fs.unlink(file.path);
      return res.status(400).json({ 
        message: 'Invalid file type. Only .tar, .gz, and .tgz files are allowed' 
      });
    }

    // 加載鏡像
    const { stdout } = await execPromise(`docker load -i ${file.path}`);
    
    // 清理臨時文件
    await fs.unlink(file.path);

    res.json({ 
      message: 'Image uploaded successfully', 
      details: stdout 
    });
  } catch (error) {
    logError(error, 'uploading image');
    // 清理臨時文件
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logError(unlinkError, 'cleaning up temp file');
      }
    }
    res.status(500).json({ 
      message: 'Failed to upload image', 
      error: error.message 
    });
  }
};

// 刪除鏡像
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Image ID is required' });
    }

    // 檢查鏡像是否存在
    try {
      await execPromise(`docker inspect ${id}`);
    } catch (error) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // 強制刪除鏡像
    await execPromise(`docker rmi ${id} -f`);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    logError(error, 'deleting image');
    res.status(500).json({ 
      message: 'Failed to delete image', 
      error: error.message 
    });
  }
};

// 安裝鏡像
const installImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { registry, tag, pullPolicy } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Image ID is required' });
    }

    let pullCommand = `docker pull ${id}`;
    if (registry && tag) {
      pullCommand = `docker pull ${registry}/${id}:${tag}`;
    }

    const { stdout } = await execPromise(pullCommand);
    res.json({ 
      message: 'Image installed successfully', 
      details: stdout 
    });
  } catch (error) {
    logError(error, 'installing image');
    res.status(500).json({ 
      message: 'Failed to install image', 
      error: error.message 
    });
  }
};

module.exports = {
  getImages,
  getImageDetails,
  uploadImage,
  deleteImage,
  installImage
}; 