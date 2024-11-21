const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const k8sService = require('../services/k8sService');
const logger = require('../utils/logger');   

class ContainerRuntime {
  constructor() {
    this.runtime = process.env.CONTAINER_RUNTIME || 'docker';
    this.namespace = process.env.CONTAINER_NAMESPACE || 'k8s.io';
    logger.info('🐳 Container runtime:', this.runtime);
    logger.info('🐳 Container namespace:', this.namespace);
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async executeCommand(command, retryCount = 0) {
    logger.info('🐳 Executing command:', command);
    try {
      // 在 Pod 中執行節點上的容器命令
      if (process.env.KUBERNETES_SERVICE_HOST) {
        const nodeName = process.env.NODE_NAME;
        if (!nodeName) {
          throw new Error('NODE_NAME environment variable is required for executing container commands in Kubernetes');
        }

        // 使用 kubectl debug node 來在節點上執行命令
        let debugCommand;
        if (this.runtime === 'nerdctl') {
          debugCommand = `kubectl debug node/${nodeName} --image=busybox:stable -- nsenter -t 1 -m -u -n -i -- nerdctl --namespace ${this.namespace} ${command}`;
        } else {
          debugCommand = `kubectl debug node/${nodeName} --image=busybox:stable -- nsenter -t 1 -m -u -n -i -- docker ${command}`;
        }

        logger.info('🐳 Executing debug command:', debugCommand);
        const { stdout, stderr } = await execAsync(debugCommand);
        
        if (stderr && !stderr.includes('Defaulted container')) {
          logger.error('Command stderr:', stderr);
        }
        return stdout;
      } 
      // 如果在主機上運行，直接執行命令
      else {
        const finalCommand = this.runtime === 'nerdctl' 
          ? `nerdctl --namespace ${this.namespace} ${command}`
          : `docker ${command}`;

        logger.info('🐳 Executing command:', finalCommand);
        const { stdout, stderr } = await execAsync(finalCommand);
        if (stderr) {
          logger.error('Command stderr:', stderr);
        }
        return stdout;
      }
    } catch (error) {
      logger.error(`執行容器命令失敗: ${error.message}`);
      
      if (retryCount < this.maxRetries) {
        logger.info(`重試執行命令 (${retryCount + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.executeCommand(command, retryCount + 1);
      }
      
      throw new Error(`容器命令執行失敗 (重試 ${retryCount} 次後): ${error.message}`);
    }
  }

  // 基本容器操作
  async listContainers() {
    return this.executeCommand('ps -a');
  }

  async runContainer(image, options = '') {
    return this.executeCommand(`run ${options} ${image}`);
  }

  async stopContainer(containerId) {
    return this.executeCommand(`stop ${containerId}`);
  }

  async removeContainer(containerId) {
    return this.executeCommand(`rm ${containerId}`);
  }

  // 映像檔管理
  async listImages(format = '"{{json .}}"') {
    try {
      if (process.env.KUBERNETES_SERVICE_HOST && !process.env.NODE_NAME) {
        throw new Error('缺少必要的 NODE_NAME 環境變數');
      }
      // 使用更簡單的格式來避免 JSON 解析問題
      const command = `images --format "ID={{.ID}}\tREPO={{.Repository}}\tTAG={{.Tag}}\tSIZE={{.Size}}\tCREATED={{.CreatedAt}}"`;
      const output = await this.executeCommand(command);
      
      // 解析輸出為結構化數據
      return output.trim().split('\n').map(line => {
        const parts = line.split('\t');
        const data = {};
        parts.forEach(part => {
          const [key, value] = part.split('=');
          data[key] = value;
        });
        return data;
      });
    } catch (error) {
      logger.error('列出映像檔失敗:', error);
      throw error;
    }
  }

  async pullImage(imageName) {
    return this.executeCommand(`pull ${imageName}`);
  }

  async removeImage(imageId) {
    return this.executeCommand(`rmi ${imageId}`);
  }

  async inspectImage(imageName) {
    return this.executeCommand(`inspect ${imageName}`);
  }

  async tagImage(source, target) {
    return this.executeCommand(`tag ${source} ${target}`);
  }

  async pushImage(imageName) {
    return this.executeCommand(`push ${imageName}`);
  }

  // 映像檔匯入匯出
  async saveImage(outputPath, images) {
    return this.executeCommand(`save -o "${outputPath}" ${images}`);
  }

  async loadImage(inputPath) {
    return this.executeCommand(`load --input "${inputPath}"`);
  }

  // 映像檔倉庫操作
  async listRepositories(format = '"{{.Repository}}"') {
    return this.executeCommand(`images --format ${format}`);
  }

  async listTags(repository, format = '"{{.Tag}}"') {
    return this.executeCommand(`images ${repository} --format ${format}`);
  }

  async searchImages(term, format = '"{{.Name}}"') {
    return this.executeCommand(`search ${term} --format ${format}`);
  }

  // 系統檢查
  async healthCheck() {
    try {
      await this.executeCommand('info');
      return { status: 'healthy', runtime: this.runtime };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new ContainerRuntime();
