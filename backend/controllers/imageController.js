const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const execPromise = util.promisify(exec);
const multer = require('multer');

// 確保上傳目錄存在
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('📁 Created upload directory:', UPLOAD_DIR);
}

// 修改 multer 配置
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10000, // 2GB
    files: 1
  }
});

// 日誌記錄函數
const logError = (error, operation) => {
  console.error(`Error during ${operation}:`, error);
  // 這裡可以添加更多的日誌記錄邏輯，比如寫入文件或發送到日誌服務
};

// 檢查 Docker 權限的函數
const checkDockerPermissions = async () => {
  try {
    console.log('🔍 Checking Docker permissions...');
    await execPromise('docker ps');
    console.log('✅ Docker permissions verified');
    return true;
  } catch (error) {
    console.error('❌ Docker permission check failed:', error.message);
    if (error.message.includes('permission denied')) {
      throw new Error('No permission to execute Docker commands. Please ensure the user is in the docker group.');
    } else if (error.message.includes('Cannot connect to the Docker daemon')) {
      throw new Error('Cannot connect to Docker daemon. Please ensure Docker is running.');
    }
    throw error;
  }
};

// 包裝 Docker 命令執行
const executeDockerCommand = async (command) => {
  try {
    console.log('🐳 Executing Docker command:', command);
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      console.warn('⚠️ Docker command stderr:', stderr);
    }
    return stdout;
  } catch (error) {
    console.error('❌ Docker command failed:', error);
    if (error.message.includes('permission denied')) {
      throw new Error('Permission denied while executing Docker command');
    }
    throw error;
  }
};

const parseImageNameAndTag = (fullName) => {
  console.log('🔍 Parsing image name:', fullName);
  
  // 分割最後一個冒號來獲取標籤
  const lastColonIndex = fullName.lastIndexOf(':');
  const tag = lastColonIndex !== -1 ? fullName.slice(lastColonIndex + 1) : 'latest';
  const nameWithoutTag = lastColonIndex !== -1 ? fullName.slice(0, lastColonIndex) : fullName;
  
  console.log('📝 Parsed result:', { name: nameWithoutTag, tag });
  return { name: nameWithoutTag, tag };
};

// 獲取所有鏡像
const getImages = async (req, res) => {
  console.log('🔍 Getting all images');
  try {
    await checkDockerPermissions();
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
          const { name, tag } = parseImageNameAndTag(`${image.Repository}:${image.Tag}`);
          return {
            id: image.ID,
            name: name,
            tag: tag,
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
    console.error('❌ Error getting images:', error);
    res.status(500).json({
      message: 'Failed to get images',
      error: error.message
    });
  }
};


// 獲取鏡像詳情
const getImageDetails = async (req, res) => {
  try {
    const { name, tag } = req.params;
    console.log('🔍 Getting details for image:', { name, tag });

    const imageName = tag ? `${name}:${tag}` : name;
    console.log('📝 Full image name:', imageName);
    
    const { stdout } = await execPromise(`docker inspect ${imageName}`);
    const details = JSON.parse(stdout)[0];
    console.log('📦 Raw image details:', details);

    // 確保 RepoTags 是數組並處理 null/undefined 情況
    let repoTags = [];
    if (details.RepoTags && Array.isArray(details.RepoTags)) {
      repoTags = details.RepoTags;
    } else if (details.RepoTags === null || details.RepoTags === undefined) {
      // 如果 RepoTags 不存在，使用當前的名稱和標籤
      repoTags = [`${name}:${tag || 'latest'}`];
    }

    console.log('🏷️ Image tags:', repoTags);

    // 解析每個標籤
    const tagInfo = repoTags.map(tagString => {
      const lastColonIndex = tagString.lastIndexOf(':');
      if (lastColonIndex === -1) {
        return {
          repository: tagString,
          tag: 'latest'
        };
      }
      return {
        repository: tagString.slice(0, lastColonIndex),
        tag: tagString.slice(lastColonIndex + 1)
      };
    });

    console.log('📑 Parsed tag info:', tagInfo);

    const response = {
      id: details.Id,
      repoTags: tagInfo,
      size: details.Size,
      createdAt: details.Created,
      architecture: details.Architecture,
      os: details.Os,
      author: details.Author,
      details: {
        config: {
          env: details.Config?.Env || [],
          cmd: details.Config?.Cmd || [],
          workdir: details.Config?.WorkingDir,
          exposedPorts: details.Config?.ExposedPorts || {},
          labels: details.Config?.Labels || {},
          volumes: details.Config?.Volumes || {}
        },
        layers: details.RootFS?.Layers || [],
        history: details.History || [],
        platform: {
          os: details.Os,
          architecture: details.Architecture,
          variant: details.Variant || '',
          osVersion: details.OsVersion || '',
          osFeatures: details.OsFeatures || []
        }
      }
    };

    console.log('✅ Formatted response:', response);
    res.json(response);
  } catch (error) {
    console.error('❌ Error in getImageDetails:', error);
    res.status(500).json({ 
      message: 'Failed to fetch image details',
      error: error.message 
    });
  }
};

// 上傳新鏡像
const uploadImage = async (req, res) => {
  console.log('📤 Starting image upload process');
  console.log('📦 Request file:', req.file);
  
  try {
    const { file } = req;
    if (!file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('📊 File details:', {
      originalName: file.originalname,
      size: file.size,
      path: file.path,
      mimetype: file.mimetype
    });

    // 驗證文件類型
    const validTypes = ['.tar', '.gz', '.tgz'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!validTypes.includes(ext)) {
      console.error('❌ Invalid file type:', ext);
      await fsPromises.unlink(file.path);
      return res.status(400).json({ 
        message: 'Invalid file type. Only .tar, .gz, and .tgz files are allowed' 
      });
    }

    // 確保文件存在並可訪問
    try {
      await fsPromises.access(file.path, fs.constants.R_OK | fs.constants.W_OK);
      console.log('✅ File is accessible:', file.path);
    } catch (error) {
      console.error('❌ File access error:', error);
      return res.status(500).json({ 
        message: 'File access error',
        error: error.message 
      });
    }

    console.log('✅ File validation passed');
    console.log('🔄 Processing file:', file.path);

    // 返回文件路徑供後續處理
    res.json({ 
      message: 'File uploaded successfully',
      filePath: file.path
    });
  } catch (error) {
    console.error('❌ Error in uploadImage:', error);
    // 清理臨時文件
    if (req.file) {
      try {
        await fsPromises.unlink(req.file.path);
        console.log('🧹 Cleaned up temp file:', req.file.path);
      } catch (unlinkError) {
        console.error('❌ Error cleaning up temp file:', unlinkError);
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
    await checkDockerPermissions();
    const { images } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: 'No images selected for deletion' });
    }

    console.log('🗑️ Deleting images:', images);
    const results = [];

    for (const imageKey of images) {
      try {
        console.log(`🗑️ Removing image: ${imageKey}`);
        await execPromise(`docker rmi ${imageKey}`);
        console.log(`✅ Successfully removed image: ${imageKey}`);
        results.push({
          image: imageKey,
          status: 'success'
        });
      } catch (error) {
        console.error(`❌ Error removing image ${imageKey}:`, error);
        results.push({
          image: imageKey,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      message: 'Images deletion completed',
      results
    });
  } catch (error) {
    console.error('❌ Error in deleteImage:', error);
    
    if (error.message.includes('permission denied')) {
      return res.status(403).json({
        message: 'Permission denied',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Failed to delete images',
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

const packageImages = async (req, res) => {
  console.log('📦 Packaging images request received');
  const { images } = req.body;
  console.log('📦 Images to package:', images);
  
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ message: 'No images selected for packaging' });
  }

  const tempDir = path.join(__dirname, '../temp');
  const outputFile = path.join(tempDir, `docker-images-${new Date().toISOString().split('T')[0]}.tar`);

  try {
    // 確保臨時目錄存在
    await fsPromises.mkdir(tempDir, { recursive: true });
    
    // 使用完整的鏡像名構建命令
    const imageList = images.map(img => img.fullName).join(' ');
    const command = `docker save -o "${outputFile}" ${imageList}`;
    
    console.log('🚀 Executing command:', command);
    await execPromise(command);

    // 設置響應頭
    res.setHeader('Content-Type', 'application/x-tar');
    res.setHeader('Content-Disposition', 
      `attachment; filename=docker-images-${images.map(img => img.name).join('-')}-${Date.now()}.tar`
    );

    // 使用標準 fs 模組的 createReadStream
    const fileStream = fs.createReadStream(outputFile);
    fileStream.pipe(res);

    // 文件發送完成後清理
    fileStream.on('end', async () => {
      try {
        await fsPromises.unlink(outputFile);
        console.log('✅ Temporary file cleaned up:', outputFile);
      } catch (cleanupError) {
        console.error('❌ Error cleaning up temp file:', cleanupError);
      }
    });

    // 錯誤處理
    fileStream.on('error', (error) => {
      console.error('❌ Error streaming file:', error);
      res.status(500).json({ 
        message: 'Error streaming file',
        error: error.message 
      });
    });
  } catch (error) {
    console.error('❌ Error packaging images:', error);
    // 清理臨時文件
    try {
      await fsPromises.unlink(outputFile);
    } catch (cleanupError) {
      console.error('❌ Error cleaning up temp file:', cleanupError);
    }
    res.status(500).json({ 
      message: 'Failed to package images', 
      error: error.message 
    });
  }
};

const extractImages = async (req, res) => {
  console.log('🔍 Starting image extraction process');
  console.log('📥 Request body:', req.body);
  
  try {
    await checkDockerPermissions();
    const { filePath } = req.body;
    console.log('📂 Processing file:', filePath);
    
    // 檢查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      return res.status(404).json({ 
        message: 'File not found',
        error: `File ${filePath} does not exist`
      });
    }

    // 使用 docker load 命令來解析文件
    console.log('🐳 Executing docker load command');
    const { stdout } = await execPromise(`docker load --input "${filePath}" --quiet`);
    console.log('📤 Docker load output:', stdout);
    
    // 解析輸出以獲取鏡像列表
    const images = stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        console.log('📝 Processing line:', line);
        const match = line.match(/Loaded image: (.+)/);
        if (!match) {
          console.log('⚠️ No match found in line');
          return null;
        }
        
        const fullName = match[1];
        const { name, tag } = parseImageNameAndTag(fullName);
        return { 
          name, 
          tag, 
          originalName: fullName  // 保存原始名稱用於後操作
        };
      })
      .filter(Boolean);

    console.log('✅ Extracted images:', images);

    // 清理臨時文件
    try {
      await fsPromises.unlink(filePath);
      console.log('🧹 Cleaned up temp file:', filePath);
    } catch (unlinkError) {
      console.error('⚠️ Error cleaning up temp file:', unlinkError);
    }

    res.json({ images });
  } catch (error) {
    console.error('❌ Error in extractImages:', error);
    if (error.message.includes('permission')) {
      return res.status(403).json({
        message: 'Permission denied',
        error: error.message
      });
    }
    res.status(500).json({
      message: 'Failed to extract images',
      error: error.message
    });
  }
};

const loadImages = async (req, res) => {
  try {
    const { images } = req.body;
    console.log('🔄 Loading images:', images);
    for (const image of images) {
      await execPromise(`docker load --input ${image.path}`);
    }

    res.json({ message: 'Images loaded successfully' });
  } catch (error) {
    console.error('Error loading images:', error);
    res.status(500).json({ 
      message: 'Failed to load images',
      error: error.message 
    });
  }
};

const retagImages = async (req, res) => {
  try {
    await checkDockerPermissions();
    const { images, repository, port, keepOriginal } = req.body;
    console.log('🏷️ Retagging images:', { images, repository, port, keepOriginal });
    
    const results = [];
    for (const image of images) {
      const newTag = `${repository}:${port}/${image.name}:${image.tag}`;
      console.log(`🔄 Retagging ${image.originalName} to ${newTag}`);
      
      // 使用包裝函數執行 Docker 命令
      await executeDockerCommand(`docker tag ${image.originalName} ${newTag}`);
      await executeDockerCommand(`docker push ${newTag}`);
      
      // 根據 keepOriginal 決定是否刪除原始鏡像
      if (!keepOriginal) {
        try {
          await executeDockerCommand(`docker rmi ${image.originalName}`);
          console.log(`🗑️ Removed original image: ${image.originalName}`);
        } catch (removeError) {
          console.warn(`⚠️ Could not remove original image: ${removeError.message}`);
        }
      } else {
        console.log(`📦 Keeping original image: ${image.originalName}`);
      }
      
      results.push({
        original: image.originalName,
        new: newTag,
        status: 'success',
        kept: keepOriginal
      });
    }

    console.log('✅ All images processed:', results);
    res.json({ 
      message: 'Images retagged and pushed successfully',
      results 
    });
  } catch (error) {
    console.error('❌ Error in retagImages:', error);
    if (error.message.includes('permission')) {
      return res.status(403).json({
        message: 'Permission denied',
        error: error.message
      });
    }
    res.status(500).json({
      message: 'Failed to retag images',
      error: error.message
    });
  }
};

// 獲取本地倉庫中的鏡像列表
const getRepositories = async (req, res) => {
  try {
    const { stdout } = await execPromise('docker images --format "{{.Repository}}"');
    const repositories = [...new Set(stdout.trim().split('\n'))];
    res.json(repositories);
  } catch (error) {
    console.error('❌ Error getting repositories:', error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取指定倉庫的標籤列表
const getTags = async (req, res) => {
  try {
    const { repository } = req.query;
    if (!repository) {
      return res.status(400).json({ error: 'Repository parameter is required' });
    }
    
    const { stdout } = await execPromise(`docker images ${repository} --format "{{.Tag}}"`);
    const tags = stdout.trim().split('\n').filter(tag => tag !== '<none>');
    res.json(tags);
  } catch (error) {
    console.error('❌ Error getting tags:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getImages,
  getImageDetails,
  uploadImage,
  deleteImage,
  installImage,
  packageImages,
  extractImages,
  loadImages,
  retagImages,
  getRepositories,
  getTags
}; 