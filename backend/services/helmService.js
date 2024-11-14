const util = require('util');
const exec = util.promisify(require('child_process').exec);

class HelmService {
  async executeCommand(command) {
    try {
      console.log('🎮 Executing Helm command:', command);
      const { stdout, stderr } = await exec(`helm ${command}`);
      return { stdout, stderr };
    } catch (error) {
      console.error('❌ Helm command failed:', error);
      throw new Error(`Helm command execution failed: ${error.message}`);
    }
  }
}

module.exports = new HelmService();
