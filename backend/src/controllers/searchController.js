import { exec } from 'child_process';
import { promisify } from 'util';
import { parseImageInfo } from '../utils/parser';

const execAsync = promisify(exec);

export const searchImages = async (req, res) => {
  const { query, filter } = req.query;
  
  try {
    const { stdout } = await execAsync('docker images --format "{{json .}}"');
    let images = stdout
      .trim()
      .split('\n')
      .map(line => JSON.parse(line))
      .map(parseImageInfo);

    // 應用搜索過濾
    if (query) {
      const searchTerm = query.toLowerCase();
      images = images.filter(image => 
        image.name.toLowerCase().includes(searchTerm) ||
        image.tag.toLowerCase().includes(searchTerm)
      );
    }

    // 應用其他過濾條件
    if (filter) {
      const filterObj = JSON.parse(filter);
      images = images.filter(image => {
        for (const [key, value] of Object.entries(filterObj)) {
          if (image[key] !== value) return false;
        }
        return true;
      });
    }

    res.json(images);
  } catch (error) {
    console.error('Failed to search images:', error);
    res.status(500).json({ error: 'Failed to search images' });
  }
}; 