const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const k8sService = require('../services/k8sService');
const { executeKubectlCommand } = require('../controllers/k8sController');

// 獲取節點列表
router.get('/nodes', authenticateToken, async (req, res) => {
  try {
    console.log('Getting nodes list');
    const nodes = await k8sService.getNodes();
    res.json(nodes);
  } catch (error) {
    console.error('Failed to get nodes:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取 StorageClass 列表
router.get('/storage/classes', authenticateToken, async (req, res) => {
  try {
    console.log('Getting storage classes');
    const storageClasses = await k8sService.listStorageClasses();
    res.json(storageClasses);
  } catch (error) {
    console.error('Failed to get storage classes:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取 PersistentVolume 列表
router.get('/storage/persistent-volumes', authenticateToken, async (req, res) => {
  try {
    console.log('Getting persistent volumes');
    const { namespace } = req.query;
    const persistentVolumes = await k8sService.listPersistentVolumes(namespace);
    res.json(persistentVolumes);
  } catch (error) {
    console.error('Failed to get persistent volumes:', error);
    res.status(500).json({ error: error.message });
  }
});

// 創建 StorageClass
router.post('/storage/classes', authenticateToken, async (req, res) => {
  try {
    const { name, version, yaml } = req.body;
    console.log('Creating StorageClass:', { name, version });
    
    // 創建 StorageClass
    const storageClass = await k8sService.createStorageClass(yaml);
    
    // 保存 YAML 文件
    const filePath = await k8sService.saveStorageClassYaml(name, version, yaml);
    
    res.json({
      message: 'StorageClass created and saved successfully',
      storageClass,
      filePath
    });
  } catch (error) {
    console.error('Failed to create StorageClass:', error);
    res.status(500).json({
      error: 'Failed to create StorageClass',
      details: error.message
    });
  }
});

// 獲取 StorageClass YAML
router.get('/storage/classes/:name/:version', authenticateToken, async (req, res) => {
  try {
    const { name, version } = req.params;
    const yaml = await k8sService.getStorageClassYaml(name, version);
    res.json({ yaml });
  } catch (error) {
    console.error('Failed to get StorageClass YAML:', error);
    res.status(500).json({
      error: 'Failed to get StorageClass YAML',
      details: error.message
    });
  }
});

// 保存儲存配置
router.post('/storage/config', authenticateToken, async (req, res) => {
  try {
    const { name, version, storageClassYaml, persistentVolumeYaml } = req.body;
    
    // 保存 YAML 文件
    const result = await k8sService.saveStorageConfig(
      name,
      version,
      storageClassYaml,
      persistentVolumeYaml
    );
    
    res.json(result);
  } catch (error) {
    console.error('Failed to save storage configuration:', error);
    res.status(500).json({
      error: 'Failed to save storage configuration',
      details: error.message
    });
  }
});

// 獲取儲存配置
router.get('/storage/config/:name/:version', authenticateToken, async (req, res) => {
  try {
    const { name, version } = req.params;
    const config = await k8sService.getStorageConfig(name, version);
    res.json(config);
  } catch (error) {
    console.error('Failed to get storage configuration:', error);
    res.status(500).json({
      error: 'Failed to get storage configuration',
      details: error.message
    });
  }
});

// 添加命名空間路由
router.get('/namespaces', authenticateToken, async (req, res) => {
  try {
    const namespaces = await k8sService.getNamespaces();
    res.json(namespaces);
  } catch (error) {
    console.error('Failed to get namespaces:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create namespace
router.post('/namespaces', authenticateToken, async (req, res) => {
  try {
    const { namespace } = req.body;

    // Validate namespace name
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(namespace)) {
      return res.status(400).json({
        error: 'Invalid namespace name. Must consist of lowercase alphanumeric characters or "-", and must start and end with an alphanumeric character.'
      });
    }

    // Check if namespace exists
    const exists = await k8sService.namespaceExists(namespace);
    if (exists) {
      return res.status(409).json({
        error: 'Namespace already exists'
      });
    }

    // Create namespace
    const result = await k8sService.createNamespace(namespace);
    
    res.json({
      message: 'Namespace created successfully',
      namespace: result
    });
  } catch (error) {
    console.error('Failed to create namespace:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get nodes
router.get('/nodes', authenticateToken, async (req, res) => {
  try {
    const nodes = await k8sService.getNodes();
    res.json(nodes);
  } catch (error) {
    console.error('Failed to get nodes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get node details
router.get('/nodes/:name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const node = await k8sService.getNodeDetails(name);
    res.json(node);
  } catch (error) {
    console.error('Failed to get node details:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/execute', executeKubectlCommand);

module.exports = router; 