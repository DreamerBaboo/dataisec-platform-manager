const k8sService = require('../services/k8sService');

const executeKubectlCommand = async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const result = await k8sService.executeCommand(command);
    res.json({
      stdout: result.stdout ? result.stdout.toString() : '',
      stderr: result.stderr ? result.stderr.toString() : ''
    });
  } catch (error) {
    console.error('kubectl command execution failed:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
};

module.exports = {
  executeKubectlCommand
}; 