const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const logger = require('../utils/logger');   
const fsPromises = require('fs').promises;

class ContainerRuntime {
  constructor() {
    this.runtime = process.env.CONTAINER_RUNTIME || 'docker';
    logger.info('🚀 初始化容器運行時:', {
      runtime: this.runtime
    });
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async executeCommand(command, retryCount = 0) {
    const startTime = Date.now();
    logger.info('🎯 開始執行命令:', {
      command,
      retryCount,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.executeDirectCommand(command);
      const duration = Date.now() - startTime;
      logger.info('✅ 命令執行成功:', {
        command,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      return result;
    } catch (error) {
      logger.error('❌ 執行容器命令失敗:', {
        command,
        error: error.message,
        duration: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      });
      
      if (retryCount < this.maxRetries) {
        logger.info(`🔄 重試執行命令 (${retryCount + 1}/${this.maxRetries})`, {
          command,
          timestamp: new Date().toISOString()
        });
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.executeCommand(command, retryCount + 1);
      }
      
      throw error;
    }
  }

  async executeDirectCommand(command) {
    const startTime = Date.now();
    logger.info('🎯 嘗試執行命令:', {
      command,
      timestamp: new Date().toISOString()
    });

    const hasDocker = await this.checkCommand('docker');
    const hasNerdctl = await this.checkCommand('nerdctl');
    const hasCrictl = await this.checkCommand('crictl');

    let finalCommand;
    if (hasDocker) {
      finalCommand = `docker ${command}`;
    } else if (hasNerdctl) {
      // 處理 format 參數的引號
      if (command.includes('--format')) {
        const parts = command.split('--format');
        const baseCommand = parts[0].trim();
        const formatPart = parts[1].trim();
        finalCommand = `nerdctl --namespace k8s.io ${baseCommand} --format '${formatPart}'`;
      } else {
        finalCommand = `nerdctl --namespace k8s.io ${command}`;
      }
    } else if (hasCrictl) {
      finalCommand = `crictl ${command}`;
    } else {
      throw new Error('No container runtime available');
    }

    logger.info('🚀 執行最終命令:', {
      finalCommand,
      timestamp: new Date().toISOString()
    });

    const { stdout, stderr } = await execAsync(finalCommand);
    
    if (stderr) {
      logger.warn('⚠️ 命令產生警告:', {
        command: finalCommand,
        stderr,
        timestamp: new Date().toISOString()
      });
    }

    logger.info('✅ 命令執行完成:', {
      command: finalCommand,
      duration: `${Date.now() - startTime}ms`,
      outputLength: stdout.length,
      timestamp: new Date().toISOString()
    });

    return stdout;
  }

  async checkCommand(cmd) {
    try {
      await execAsync(`which ${cmd}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 映像檔管理
  async listImages() {
    try {
      logger.info('📝 開始列出映像檔');

      const command = 'images --format {"ID":"{{.ID}}", "REPO":"{{.Repository}}", "TAG":"{{.Tag}}", "SIZE":"{{.Size}}", "CREATED":"{{.CreatedAt}}"}';
      const output = await this.executeCommand(command);
      
      logger.info('📄 原始輸出:', {
        output: output.substring(0, 1000), // 只記錄前1000個字符
        length: output.length
      });

      // 分割並過濾空行
      const lines = output.trim().split('\n').filter(line => line.trim());
      logger.info('📑 分割後的行數:', lines.length);

      // 解析每一行
      const images = lines.map((line, index) => {
        try {
          logger.info(`解析第 ${index + 1} 行:`, { line });
          const image = JSON.parse(line);
          // 確保所有字段都是大寫格式
          const processed = {
            ID: String(image.ID || ''),
            REPO: String(image.REPO || image.Repository || ''),
            TAG: String(image.TAG || image.Tag || ''),
            SIZE: String(image.SIZE || image.Size || ''),
            CREATED: String(image.CREATED || image.Created || '')
          };
          logger.info(`第 ${index + 1} 行解析結果:`, processed);
          return processed;
        } catch (e) {
          logger.error(`第 ${index + 1} 行解析失敗:`, {
            line,
            error: e.message
          });
          return null;
        }
      })
      .filter(img => img !== null)
      .filter(img => {
        const isValid = img.REPO && img.REPO !== 'sha256' && 
                       img.TAG && img.TAG !== '<none>';
        if (!isValid) {
          logger.info('過濾掉無效映像:', img);
        }
        return isValid;
      });

      logger.info('✅ 最終處理結果:', {
        totalImages: images.length,
        sampleImage: images[0],
        allImages: images
      });

      return images;
    } catch (error) {
      logger.error('❌ 列出映像檔失敗:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async saveImage(imageNames, outputPath) {
    try {
      // 檢查映像名稱是否為空
      if (!imageNames.trim()) {
        throw new Error('未提供映像名稱');
      }

      const command = `save -o "${outputPath}" ${imageNames}`;
      logger.info('執行保存映像命令:', command);
      
      const { stdout, stderr } = await this.executeCommand(command);
      
      if (stderr) {
        logger.warn('保存映像時出現警告:', stderr);
      }
      
      // 驗證文件是否已創建
      try {
        await fsPromises.access(outputPath);
        const stats = await fsPromises.stat(outputPath);
        if (stats.size === 0) {
          throw new Error('生成的文件大小為0');
        }
        logger.info(`映像檔已成功保存到 ${outputPath}, 大小: ${stats.size} bytes`);
        return outputPath;
      } catch (error) {
        throw new Error(`無法訪問或驗證保存的文件: ${error.message}`);
      }
    } catch (error) {
      logger.error('保存映像失敗:', error);
      // 如果文件存在但保存失敗，嘗試清理
      try {
        await fsPromises.unlink(outputPath);
      } catch (unlinkError) {
        logger.warn('清理失敗的輸出文件時出錯:', unlinkError);
      }
      throw new Error(`保存映像失敗: ${error.message}`);
    }
  }

  async deleteImage(imageNames) {
    try {
      // 檢查映像名稱是否為空
      if (!imageNames || (Array.isArray(imageNames) && imageNames.length === 0)) {
        throw new Error('未提供映像名稱');
      }

      // 將單個映像名稱轉換為數組
      const imageList = Array.isArray(imageNames) ? imageNames : [imageNames];
      
      const results = [];
      for (const imageName of imageList) {
        try {
          const command = `rmi ${imageName}`;
          logger.info(`執行刪除映像命令: ${command}`);
          
          const { stdout, stderr } = await this.executeCommand(command);
          
          if (stderr && !stderr.includes('Deleted:')) {
            logger.warn(`刪除映像 ${imageName} 時出現警告:`, stderr);
          }
          
          results.push({
            imageName,
            success: true,
            message: stdout || '映像已成功刪除'
          });
          
        } catch (error) {
          logger.error(`刪除映像 ${imageName} 失敗:`, error);
          results.push({
            imageName,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error('刪除映像操作失敗:', error);
      throw error;
    }
  }

  async loadImage(filePath) {
    try {
      const command = `load -i "${filePath}"`;
      logger.info('執行載入映像命令:', command);
      
      const { stdout, stderr } = await this.executeCommand(command);
      
      if (stderr && !stderr.includes('Loaded image')) {
        logger.warn('載入映像時出現警告:', stderr);
      }
      
      // 解析載入的映像信息
      const loadedImages = [];
      const lines = stdout.split('\n').filter(Boolean);
      
      for (const line of lines) {
        if (line.includes('Loaded image:')) {
          const imageName = line.replace('Loaded image:', '').trim();
          loadedImages.push(imageName);
        }
      }
      
      return {
        success: true,
        loadedImages,
        message: stdout
      };
      
    } catch (error) {
      logger.error('載入映像失敗:', error);
      throw new Error(`載入映像失敗: ${error.message}`);
    }
  }

  // 其他方法保持不變...
}

module.exports = new ContainerRuntime();
