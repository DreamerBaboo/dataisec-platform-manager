import { exec } from 'child_process';
import { promisify } from 'util';
import { getRegistryConfig } from '../utils/config';
import { parseImageInfo } from '../utils/parser';

const execAsync = promisify(exec);

export const getImages = async (req, res) => {
  try {
    const { stdout } = await execAsync('docker images --format "{{json .}}"');
    const images = stdout
      .trim()
      .split('\n')
      .map(line => JSON.parse(line))
      .map(parseImageInfo);
    
    res.json(images);
  } catch (error) {
    console.error('Failed to get images:', error);
    res.status(500).json({ error: 'Failed to get images' });
  }
};

export const getImageDetail = async (req, res) => {
  const { name } = req.params;
  
  try {
    const { stdout } = await execAsync(`docker inspect ${name}`);
    const detail = JSON.parse(stdout)[0];
    res.json(detail);
  } catch (error) {
    console.error('Failed to get image detail:', error);
    res.status(500).json({ error: 'Failed to get image detail' });
  }
};

export const deleteImage = async (req, res) => {
  const { name } = req.params;
  
  try {
    await execAsync(`docker rmi ${name}`);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Failed to delete image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
};

export const pullImage = async (req, res) => {
  const { name, tag } = req.body;
  const config = await getRegistryConfig();
  
  try {
    const fullName = `${config.url}:${config.port}/${name}:${tag}`;
    await execAsync(`docker pull ${fullName}`);
    res.json({ message: 'Image pulled successfully' });
  } catch (error) {
    console.error('Failed to pull image:', error);
    res.status(500).json({ error: 'Failed to pull image' });
  }
};

export const pushImage = async (req, res) => {
  const { name, tag } = req.body;
  const config = await getRegistryConfig();
  
  try {
    const fullName = `${config.url}:${config.port}/${name}:${tag}`;
    await execAsync(`docker push ${fullName}`);
    res.json({ message: 'Image pushed successfully' });
  } catch (error) {
    console.error('Failed to push image:', error);
    res.status(500).json({ error: 'Failed to push image' });
  }
};

export const tagImage = async (req, res) => {
  const { name, newTag } = req.body;
  const config = await getRegistryConfig();
  
  try {
    const fullName = `${config.url}:${config.port}/${name}:${newTag}`;
    await execAsync(`docker tag ${name} ${fullName}`);
    res.json({ message: 'Image tagged successfully' });
  } catch (error) {
    console.error('Failed to tag image:', error);
    res.status(500).json({ error: 'Failed to tag image' });
  }
};

export const getRegistryConfig = async (req, res) => {
  try {
    const config = await getRegistryConfig();
    res.json(config);
  } catch (error) {
    console.error('Failed to get registry config:', error);
    res.status(500).json({ error: 'Failed to get registry config' });
  }
};

export const updateRegistryConfig = async (req, res) => {
  const config = req.body;
  
  try {
    await saveRegistryConfig(config);
    res.json({ message: 'Registry config updated successfully' });
  } catch (error) {
    console.error('Failed to update registry config:', error);
    res.status(500).json({ error: 'Failed to update registry config' });
  }
}; 