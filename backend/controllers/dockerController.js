const dockerService = require('../services/dockerService');

// 獲取倉庫列表
const getRepositories = async (req, res) => {
  try {
    const repositories = await dockerService.listRepositories();
    res.json(repositories);
  } catch (error) {
    console.error('Error getting repositories:', error);
    res.status(500).json({ error: error.message });
  }
};

// 獲取標籤列表
const getTags = async (req, res) => {
  try {
    const { repository } = req.params;
    if (!repository) {
      return res.status(400).json({ error: 'Repository parameter is required' });
    }
    const tags = await dockerService.listTags(repository);
    res.json(tags);
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getRepositories,
  getTags
}; 