const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const k8sService = require('../services/k8sService');

class ContainerRuntime {
  constructor() {
    this.runtime = process.env.CONTAINER_RUNTIME || 'docker';
    this.namespace = process.env.CONTAINER_NAMESPACE || 'k8s.io';
    console.log('🐳 Container runtime:', this.runtime);
    console.log('🐳 Container namespace:', this.namespace);
  }

  async executeCommand(command) {
    console.log('entered 🐳 Executing command:', command);
    try {
      // 如果是在 Pod 內部運行，使用 kubectl exec 來執行 nerdctl 命令
      if (process.env.KUBERNETES_SERVICE_HOST) {
        const nodeName = process.env.NODE_NAME;
        if (!nodeName) {
          throw new Error('NODE_NAME environment variable is required for executing container commands in Kubernetes');
        }

        // 構建 kubectl 命令
        let kubectlCommand;
        if (this.runtime === 'nerdctl') {
          kubectlCommand = `kubectl debug node/${nodeName} -it --image=ubuntu -- nsenter -t 1 -m -u -n -i nerdctl --namespace ${this.namespace} ${command}`;
        } else {
          kubectlCommand = `kubectl debug node/${nodeName} -it --image=ubuntu -- nsenter -t 1 -m -u -n -i docker ${command}`;
        }

        console.log('🐳 Executing kubectl command:', kubectlCommand);
        const { stdout, stderr } = await execAsync(kubectlCommand);
        if (stderr && !stderr.includes('Defaulted container')) {
          console.error('Command stderr:', stderr);
        }
        return stdout;
      } 
      // 如果是在主機上運行，直接執行命令
      else {
        if (this.runtime === 'nerdctl') {
          command = `nerdctl --namespace ${this.namespace} ${command}`;
        } else {
          command = `docker ${command}`;
        }
        console.log('🐳 Executing command:', command);
        const { stdout, stderr } = await execAsync(command);
        if (stderr) {
          console.error('Command stderr:', stderr);
        }
        return stdout;
      }
    } catch (error) {
      console.error(`Error executing container command: ${error.message}`);
      throw error;
    }
  }

  async listContainers() {
    return this.executeCommand('ps -a');
  }

  async runContainer(image, options) {
    return this.executeCommand(`run ${options} ${image}`);
  }

  async stopContainer(containerId) {
    return this.executeCommand(`stop ${containerId}`);
  }

  async listImages(format = '"{{json .}}"') {
    try {
      // 只有在 Kubernetes 環境中才檢查 NODE_NAME
      if (process.env.KUBERNETES_SERVICE_HOST && !process.env.NODE_NAME) {
        throw new Error('缺少必要的 NODE_NAME 環境變數');
      }
      return this.executeCommand(`images --format ${format}`);
    } catch (error) {
      console.error('列出映像檔失敗:', error);
      throw error;
    }
  }

  async inspectImage(imageName) {
    return this.executeCommand(`inspect ${imageName}`);
  }

  async removeImage(imageId) {
    return this.executeCommand(`rmi ${imageId}`);
  }

  async pullImage(imageName) {
    return this.executeCommand(`pull ${imageName}`);
  }

  async saveImage(outputPath, images) {
    return this.executeCommand(`save -o "${outputPath}" ${images}`);
  }

  async loadImage(inputPath) {
    return this.executeCommand(`load --input "${inputPath}"`);
  }

  async tagImage(source, target) {
    return this.executeCommand(`tag ${source} ${target}`);
  }

  async pushImage(imageName) {
    return this.executeCommand(`push ${imageName}`);
  }

  async listRepositories(format = '"{{.Repository}}"') {
    return this.executeCommand(`images --format ${format}`);
  }

  async listTags(repository, format = '"{{.Tag}}"') {
    return this.executeCommand(`images ${repository} --format ${format}`);
  }

  async searchImages(term, format = '"{{.Name}}"') {
    return this.executeCommand(`search ${term} --format ${format}`);
  }
}

module.exports = new ContainerRuntime();
