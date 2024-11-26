const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const containerRuntime = require('../utils/container-runtime');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

class DockerService {
  constructor() {
    this.dockerPath = 'docker';
    this.containerRuntime = containerRuntime;
  }

  async executeCommand(args) {
    logger.info(`執行 Docker 命令: ${args.join(' ')}`);
    
    try {
      // 首先嘗試直接執行 docker 命令
      return await new Promise((resolve, reject) => {
        const process = spawn(this.dockerPath, args);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
          stdout += data.toString();
          logger.debug(`Docker stdout: ${data.toString().trim()}`);
        });

        process.stderr.on('data', (data) => {
          stderr += data.toString();
          logger.debug(`Docker stderr: ${data.toString().trim()}`);
        });

        process.on('close', (code) => {
          if (code === 0) {
            resolve(stdout.trim());
          } else {
            const errorMessage = stderr || stdout;
            logger.error(`Docker 命令失敗 (代碼 ${code}): ${errorMessage}`);
            reject(new Error(`Docker 命令失敗: ${errorMessage}`));
          }
        });

        process.on('error', (error) => {
          logger.error('Docker 命令執行錯誤:', error);
          reject(new Error(`無法執行 Docker 命令: ${error.message}`));
        });
      });
    } catch (primaryError) {
      // 如果直接執行 docker 失敗，嘗試使用 container-runtime
      logger.warn('直接執行 docker 失敗，嘗試使用 container-runtime:', primaryError);
      try {
        const result = await this.containerRuntime.executeCommand(args.join(' '));
        return result;
      } catch (fallbackError) {
        logger.error('container-runtime 也失敗:', fallbackError);
        throw new Error(`容器命令執行失敗: ${primaryError.message} (備選方案也失敗: ${fallbackError.message})`);
      }
    }
  }

  async listRepositories() {
    try {
      const output = await this.executeCommand(['images', '--format', '{"Repository":"{{.Repository}}","Tag":"{{.Tag}}","ID":"{{.ID}}","CreatedAt":"{{.CreatedAt}}","Size":"{{.Size}}"}']);
      const allImages = this.parseRepositories(output);
      
      // Create a Map to store unique repositories with their details
      const uniqueRepos = new Map();
      
      allImages.forEach(image => {
        if (!uniqueRepos.has(image.name)) {
          uniqueRepos.set(image.name, image);
        }
      });
      
      // Convert Map values back to array
      return Array.from(uniqueRepos.values())
        .filter(image => image.name !== '<none>' && !image.name.includes('sha256:'))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      logger.error('無法列出倉庫:', error);
      throw error;
    }
  }

  async listTags(repository) {
    try {
      logger.info(`獲取倉庫標籤: ${repository}`);
      const output = await this.executeCommand([
        'images',
        '--format',
        '{"Repository":"{{.Repository}}","Tag":"{{.Tag}}"}',
      ]);
      
      // Parse the output into objects
      const images = output.split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .filter(img => img.Tag !== '<none>' && img.Repository !== '<none>');

      // Filter images for the specified repository and extract tags
      const matchingTags = images
        .filter(img => img.Repository === repository)
        .map(img => img.Tag)
        .filter(Boolean);

      // Remove duplicates and sort
      const uniqueTags = [...new Set(matchingTags)].sort((a, b) => a.localeCompare(b));
      
      logger.info(`找到 ${uniqueTags.length} 個標籤，屬於 ${repository}`);
      return uniqueTags;
    } catch (error) {
      logger.error(`無法列出 ${repository} 的標籤:`, error);
      throw error;
    }
  }

  async searchImages(term) {
    try {
      const output = await this.executeCommand(['search', '--format', '{"Name":"{{.Name}}","Description":"{{.Description}}","Stars":"{{.StarCount}}","Official":"{{.IsOfficial}}","Automated":"{{.IsAutomated}}"}', term]);
      return this.parseSearchResults(output);
    } catch (error) {
      logger.error('搜索映像檔失敗:', error);
      throw error;
    }
  }

  parseRepositories(output) {
    try {
      return output
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .map(image => ({
          name: image.Repository,
          tag: image.Tag,
          id: image.ID,
          created: image.CreatedAt,
          size: image.Size
        }));
    } catch (error) {
      logger.error('解析倉庫資訊失敗:', error);
      throw error;
    }
  }

  parseSearchResults(output) {
    try {
      return output
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .map(result => ({
          name: result.Name,
          description: result.Description,
          stars: result.Stars,
          official: result.Official,
          automated: result.Automated
        }));
    } catch (error) {
      logger.error('解析搜索結果失敗:', error);
      throw error;
    }
  }

  async saveImage(imageName) {
    try {
      const timestamp = new Date().getTime();
      const sanitizedName = imageName.replace(/[\/\:]/g, '-');
      const outputPath = path.join(os.tmpdir(), `${sanitizedName}-${timestamp}.tar`);
      
      logger.info(`保存映像檔 ${imageName} 到 ${outputPath}`);
      await this.executeCommand(['save', '-o', outputPath, imageName]);
      
      return {
        filePath: outputPath,
        fileName: path.basename(outputPath)
      };
    } catch (error) {
      logger.error(`保存映像檔 ${imageName} 失敗:`, error);
      throw error;
    }
  }

  async loadImage(filePath) {
    try {
      logger.info(`從 ${filePath} 載入映像檔`);
      const result = await this.executeCommand(['load', '-i', filePath]);
      
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        logger.warn('清理臨時檔案失敗:', cleanupError);
      }
      
      return result;
    } catch (error) {
      logger.error('載入映像檔失敗:', error);
      throw error;
    }
  }

  async listImages() {
    try {
      logger.info('開始列出映像檔');
      
      const output = await this.executeCommand([
        'images',
        '--format',
        '{"ID":"{{.ID}}", "Repository":"{{.Repository}}", "Tag":"{{.Tag}}", "Created":"{{.CreatedSince}}", "Size":"{{.Size}}"}'
      ]);
      
      const images = output.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            logger.error('解析映像檔行失敗:', line, e);
            return null;
          }
        })
        .filter(img => img !== null)
        // 過濾掉 sha256 和 <none> 標籤的映像
        .filter(img => img.Repository !== 'sha256' && img.Tag !== '<none>');

      logger.info(`找到 ${images.length} 個有效映像檔`);
      logger.info('image list :', images);
      return images;
    } catch (error) {
      logger.error('列出映像檔失敗:', error);
      throw error;
    }
  }

  async inspectImage(imageName) {
    try {
      const output = await this.executeCommand(['inspect', imageName]);
      return JSON.parse(output);
    } catch (error) {
      logger.error(`檢查映像檔 ${imageName} 失敗:`, error);
      throw error;
    }
  }

  async pullImage(imageName) {
    try {
      await this.executeCommand(['pull', imageName]);
      logger.info(`成功拉取映像檔: ${imageName}`);
      return true;
    } catch (error) {
      logger.error(`拉取映像檔 ${imageName} 失敗:`, error);
      throw error;
    }
  }

  async removeImage(imageId) {
    try {
      await this.executeCommand(['rmi', imageId]);
      logger.info(`成功移除映像檔: ${imageId}`);
      return true;
    } catch (error) {
      logger.error(`移除映像檔 ${imageId} 失敗:`, error);
      throw error;
    }
  }

  async tagImage(source, target) {
    try {
      await this.executeCommand(['tag', source, target]);
      logger.info(`成功標記映像檔 ${source} 為 ${target}`);
      return true;
    } catch (error) {
      logger.error(`標記映像檔 ${source} 為 ${target} 失敗:`, error);
      throw error;
    }
  }

  async pushImage(imageName) {
    try {
      await this.executeCommand(['push', imageName]);
      logger.info(`成功推送映像檔: ${imageName}`);
      return true;
    } catch (error) {
      logger.error(`推送映像檔 ${imageName} 失敗:`, error);
      throw error;
    }
  }
}

module.exports = new DockerService();
