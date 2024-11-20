const containerService = require('./containerService');

class DockerService {
  async listRepositories() {
    try {
      return await containerService.listRepositories();
    } catch (error) {
      console.error('Failed to list repositories:', error);
      throw error;
    }
  }

  async listTags(repository) {
    try {
      console.log(`Fetching tags for repository: ${repository}`);
      const tags = await containerService.listTags(repository);
      console.log(`Found ${tags.length} tags for ${repository}`);
      return tags;
    } catch (error) {
      console.error(`Failed to list tags for ${repository}:`, error);
      throw error;
    }
  }

  async searchImages(term) {
    try {
      return await containerService.searchImages(term);
    } catch (error) {
      console.error('Failed to search images:', error);
      throw error;
    }
  }
}

module.exports = new DockerService();
