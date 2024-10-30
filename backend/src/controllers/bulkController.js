import { exec } from 'child_process';
import { promisify } from 'util';
import { getRegistryConfig } from '../utils/config';

const execAsync = promisify(exec);

export const bulkDelete = async (req, res) => {
  const { images } = req.body;
  
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Invalid images array' });
  }

  const results = [];
  const errors = [];

  for (const image of images) {
    try {
      await execAsync(`docker rmi ${image}`);
      results.push({ image, status: 'deleted' });
    } catch (error) {
      console.error(`Failed to delete image ${image}:`, error);
      errors.push({ image, error: error.message });
    }
  }

  res.json({
    success: results,
    failures: errors
  });
};

export const bulkPush = async (req, res) => {
  const { images } = req.body;
  const config = await getRegistryConfig();
  
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Invalid images array' });
  }

  const results = [];
  const errors = [];

  for (const image of images) {
    try {
      const fullName = `${config.url}:${config.port}/${image}`;
      await execAsync(`docker push ${fullName}`);
      results.push({ image, status: 'pushed' });
    } catch (error) {
      console.error(`Failed to push image ${image}:`, error);
      errors.push({ image, error: error.message });
    }
  }

  res.json({
    success: results,
    failures: errors
  });
}; 