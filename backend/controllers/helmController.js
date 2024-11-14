const helmService = require('../services/helmService');

const executeHelmCommand = async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const result = await helmService.executeCommand(command);
    res.json(result);
  } catch (error) {
    console.error('Helm command execution failed:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  executeHelmCommand
}; 