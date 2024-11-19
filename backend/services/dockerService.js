const containerRuntime = require('../utils/container-runtime');

class DockerService {
  async listRepositories() {
    try {
      const stdout = await containerRuntime.listRepositories();
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
      const stdout = await containerRuntime.listTags(repository);
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
      const stdout = await containerRuntime.searchImages(term);
      return stdout.split('\n').filter(Boolean);
    } catch (error) {
      console.error('Failed to search images:', error);
      throw error;
    }
  }
}

module.exports = new DockerService(); 