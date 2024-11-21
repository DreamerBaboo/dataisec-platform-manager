const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const ContainerService = require('./containerService');
const { spawn } = require('child_process');
const logger = require('../utils/logger');

class DockerService {

  constructor() {
    this.dockerPath = 'docker';
  }

  async executeCommand(args) {
    return new Promise((resolve, reject) => {
      logger.info(`Executing docker command: ${args.join(' ')}`);
      
      const process = spawn(this.dockerPath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Docker command failed: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to execute docker command: ${error.message}`));
      });
    });
  }

  async listRepositories() {
    try {
      const output = await this.containerService.executeCommand(['images', '--format', '{"Repository":"{{.Repository}}","Tag":"{{.Tag}}","ID":"{{.ID}}","CreatedAt":"{{.CreatedAt}}","Size":"{{.Size}}"}']);
      return this.parseRepositories(output);
    } catch (error) {
      console.error('Failed to list repositories:', error);
      throw error;
    }
  }

  async listTags(repository) {
    try {
      console.log(`Fetching tags for repository: ${repository}`);
      const output = await this.containerService.executeCommand(['images', repository, '--format', '{{.Tag}}']);
      const tags = output.split('\n').filter(Boolean);
      console.log(`Found ${tags.length} tags for ${repository}`);
      return tags;
    } catch (error) {
      console.error(`Failed to list tags for ${repository}:`, error);
      throw error;
    }
  }

  async searchImages(term) {
    try {
      const output = await this.containerService.executeCommand(['search', '--format', '{"Name":"{{.Name}}","Description":"{{.Description}}","Stars":"{{.StarCount}}","Official":"{{.IsOfficial}}","Automated":"{{.IsAutomated}}"}', term]);
      return this.parseSearchResults(output);
    } catch (error) {
      console.error('Failed to search images:', error);
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
      console.error('Failed to parse repositories:', error);
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
      console.error('Failed to parse search results:', error);
      throw error;
    }
  }

  async saveImage(imageName) {
    try {
      const timestamp = new Date().getTime();
      const sanitizedName = imageName.replace(/[\/\:]/g, '-');
      const outputPath = path.join(os.tmpdir(), `${sanitizedName}-${timestamp}.tar`);
      
      console.log(`Saving image ${imageName} to ${outputPath}`);
      await this.containerService.executeCommand(['save', '-o', outputPath, imageName]);
      
      return {
        filePath: outputPath,
        fileName: path.basename(outputPath)
      };
    } catch (error) {
      console.error(`Failed to save image ${imageName}:`, error);
      throw error;
    }
  }

  async loadImage(filePath) {
    try {
      console.log(`Loading image from ${filePath}`);
      const result = await this.containerService.executeCommand(['load', '-i', filePath]);
      
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary file:', cleanupError);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to load image:', error);
      throw error;
    }
  }

  async listImages() {
    try {
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
            logger.error('Failed to parse image line:', line, e);
            return null;
          }
        })
        .filter(img => img !== null);

      logger.info(`Found ${images.length} images`);
      return images;
    } catch (error) {
      logger.error('Error listing images:', error);
      throw error;
    }
  }

  async inspectImage(imageName) {
    try {
      const output = await this.executeCommand(['inspect', imageName]);
      return JSON.parse(output);
    } catch (error) {
      logger.error(`Error inspecting image ${imageName}:`, error);
      throw error;
    }
  }

  async pullImage(imageName) {
    try {
      await this.executeCommand(['pull', imageName]);
      logger.info(`Successfully pulled image: ${imageName}`);
      return true;
    } catch (error) {
      logger.error(`Error pulling image ${imageName}:`, error);
      throw error;
    }
  }

  async removeImage(imageId) {
    try {
      await this.executeCommand(['rmi', imageId]);
      logger.info(`Successfully removed image: ${imageId}`);
      return true;
    } catch (error) {
      logger.error(`Error removing image ${imageId}:`, error);
      throw error;
    }
  }

  async tagImage(source, target) {
    try {
      await this.executeCommand(['tag', source, target]);
      logger.info(`Successfully tagged image ${source} as ${target}`);
      return true;
    } catch (error) {
      logger.error(`Error tagging image ${source} as ${target}:`, error);
      throw error;
    }
  }

  async pushImage(imageName) {
    try {
      await this.executeCommand(['push', imageName]);
      logger.info(`Successfully pushed image: ${imageName}`);
      return true;
    } catch (error) {
      logger.error(`Error pushing image ${imageName}:`, error);
      throw error;
    }
  }
}

module.exports = new DockerService();
