const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

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
    return this.executeCommand(`images --format ${format}`);
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