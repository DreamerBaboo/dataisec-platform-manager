const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class DockerService {
  async listRepositories() {
    try {
      const { stdout } = await execAsync('docker images --format "{{.Repository}}"');
      const repositories = [...new Set(stdout.split('\n').filter(Boolean))];
      return repositories;
    } catch (error) {
      console.error('Failed to list repositories:', error);
      throw error;
    }
  }

  async listTags(repository) {
    try {
      console.log(`Fetching tags for repository: ${repository}`);
      const { stdout } = await execAsync(`docker images ${repository} --format "{{.Tag}}"`);
      const tags = stdout.split('\n').filter(Boolean);
      console.log(`Found ${tags.length} tags for ${repository}`);
      return tags;
    } catch (error) {
      console.error(`Failed to list tags for ${repository}:`, error);
      throw error;
    }
  }

  async searchImages(term) {
    try {
      const { stdout } = await execAsync(`docker search ${term} --format "{{.Name}}"`);
      return stdout.split('\n').filter(Boolean);
    } catch (error) {
      console.error('Failed to search images:', error);
      throw error;
    }
  }
}

module.exports = new DockerService(); 