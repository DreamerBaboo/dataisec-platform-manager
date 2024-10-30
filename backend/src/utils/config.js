import fs from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'config', 'registry.json');

export const getRegistryConfig = async () => {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Return default config if file doesn't exist
      return {
        url: 'localhost',
        port: 5000,
        username: '',
        password: ''
      };
    }
    throw error;
  }
};

export const saveRegistryConfig = async (config) => {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}; 