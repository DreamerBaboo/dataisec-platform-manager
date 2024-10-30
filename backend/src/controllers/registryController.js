import { exec } from 'child_process';
import { promisify } from 'util';
import { getRegistryConfig } from '../utils/config';

const execAsync = promisify(exec);

export const checkHealth = async (req, res) => {
  try {
    const config = await getRegistryConfig();
    const { stdout } = await execAsync(`curl -s http://${config.url}:${config.port}/v2/_catalog`);
    
    // 如果能成功獲取目錄,則認為 Registry 運行正常
    const healthy = true;
    const version = '2.0'; // Registry API 版本
    const uptime = await getRegistryUptime();

    res.json({
      healthy,
      version,
      uptime
    });
  } catch (error) {
    console.error('Failed to check registry health:', error);
    res.json({
      healthy: false,
      error: error.message
    });
  }
};

const getRegistryUptime = async () => {
  try {
    const { stdout } = await execAsync('docker info --format "{{.SystemTime}}"');
    return stdout.trim();
  } catch (error) {
    return 'Unknown';
  }
}; 