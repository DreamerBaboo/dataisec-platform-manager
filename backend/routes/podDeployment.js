const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const podDeploymentController = require('../controllers/podDeploymentController');
const path = require('path');
const fs = require('fs').promises;

// Pod Deployment 路由
router.post('/preview', authenticateToken, podDeploymentController.generatePreview);
router.post('/', authenticateToken, podDeploymentController.createDeployment);
router.get('/', authenticateToken, podDeploymentController.listDeployments);
router.get('/:name', authenticateToken, podDeploymentController.getDeployment);
router.delete('/:name', authenticateToken, podDeploymentController.deleteDeployment);

// 新增日誌和狀態相關路由
router.get('/logs', authenticateToken, podDeploymentController.getDeploymentLogs);
router.get('/:name/containers', authenticateToken, podDeploymentController.getContainers);
router.get('/:name/status', authenticateToken, podDeploymentController.getDeploymentStatus);

router.get('/namespaces', authenticateToken, podDeploymentController.getNamespaces);

// Add template routes
router.get('/templates/list', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting template list');
    await podDeploymentController.getTemplateList(req, res);
  } catch (error) {
    console.error('❌ Error in template list route:', error);
    res.status(500).json({
      message: 'Failed to get template list',
      error: error.message
    });
  }
});

// Add template upload route
router.post('/templates/upload', authenticateToken, async (req, res) => {
  try {
    console.log('📤 Uploading template');
    await podDeploymentController.uploadTemplate(req, res);
  } catch (error) {
    console.error('❌ Error in template upload route:', error);
    res.status(500).json({
      message: 'Failed to upload template',
      error: error.message
    });
  }
});

// Add template configuration route
router.get('/templates/:deploymentName/config', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Getting template configuration');
    await podDeploymentController.getTemplateConfig(req, res);
  } catch (error) {
    console.error('❌ Error in template config route:', error);
    res.status(500).json({
      message: 'Failed to get template configuration',
      error: error.message
    });
  }
});

// Add template content save route
router.post('/templates/:deploymentName/template', authenticateToken, async (req, res) => {
  try {
    console.log('💾 Saving template content');
    await podDeploymentController.saveTemplateContent(req, res);
  } catch (error) {
    console.error('❌ Error in template save route:', error);
    res.status(500).json({
      message: 'Failed to save template content',
      error: error.message
    });
  }
});

// Save deployment configuration
router.post('/config', authenticateToken, podDeploymentController.saveDeploymentConfig);

// Get deployment versions
router.get('/:name/versions', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    console.log('🔍 Getting versions for deployment:', name);

    // 設定路徑
    const deploymentDir = path.join(__dirname, '../deploymentTemplate', name);
    const configPath = path.join(deploymentDir, 'config.json');
    console.log('📂 Config path:', configPath);

    // 確保目錄存在
    await fs.mkdir(deploymentDir, { recursive: true });

    // 默認配置
    const defaultConfig = {
      name,
      versions: {
        '1.0.0': {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: {
            name,
            version: '1.0.0',
            namespace: 'default',
            enableResourceQuota: false,
            resourceQuota: {
              requestsCpu: '1',
              requestsMemory: '1Gi',
              limitsCpu: '2',
              limitsMemory: '2Gi',
              pods: '10',
              configmaps: '10',
              pvcs: '5',
              services: '10',
              secrets: '10',
              deployments: '5',
              replicasets: '10',
              statefulsets: '5',
              jobs: '10',
              cronjobs: '5'
            }
          }
        }
      },
      latestVersion: '1.0.0'
    };

    // 讀取或創建配置文件
    let config;
    try {
      const fileContent = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(fileContent);
      console.log('📄 Found existing config file');
    } catch (error) {
      console.log('📝 Creating new config file with default version');
      config = defaultConfig;
      
      // 保存默認配置
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      console.log('✅ Saved default config file');
    }

    // 確保至少有一個版本
    if (Object.keys(config.versions).length === 0) {
      console.log('⚠️ No versions found, adding default version');
      config.versions['1.0.0'] = defaultConfig.versions['1.0.0'];
      config.latestVersion = '1.0.0';
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }

    // 格式化版本列表
    const versions = Object.entries(config.versions).map(([version, data]) => ({
      version,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    }));

    console.log('✅ Returning versions:', versions);
    res.json({
      name,
      versions,
      latestVersion: config.latestVersion
    });

  } catch (error) {
    console.error('❌ Error handling versions request:', error);
    res.status(500).json({
      error: 'Failed to handle versions request',
      details: error.message
    });
  }
});

// Get specific version configuration
router.get('/:name/versions/:version/config', authenticateToken, async (req, res) => {
  try {
    const { name, version } = req.params;
    console.log('🔍 Getting config for:', { name, version });

    const deploymentDir = path.join(__dirname, '../deploymentTemplate', name);
    const configPath = path.join(deploymentDir, 'config.json');

    // 檢查目錄是否存在，不存在則創建
    await fs.mkdir(deploymentDir, { recursive: true });

    // 檢查配置文件是否存在
    let config;
    try {
      const fileContent = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(fileContent);
      console.log('📄 Found existing config file:', config);
    } catch (error) {
      // 如果文件不存在或無法解析，創建新的配置
      console.log('📝 Creating new config file');
      config = {
        name,
        versions: {
          [version]: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            config: {
              name,
              version,
              namespace: 'default',
              enableResourceQuota: false,
              resourceQuota: {
                requestsCpu: '1',
                requestsMemory: '1Gi',
                limitsCpu: '2',
                limitsMemory: '2Gi',
                pods: '10',
                configmaps: '10',
                pvcs: '5',
                services: '10',
                secrets: '10',
                deployments: '5',
                replicasets: '10',
                statefulsets: '5',
                jobs: '10',
                cronjobs: '5'
              }
            }
          }
        },
        latestVersion: version
      };

      // 保存新配置文件
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      console.log('✅ Created and saved new config file');
    }

    // 檢查請求的版本是否存在
    if (!config.versions[version]) {
      return res.status(404).json({
        error: 'Version not found',
        details: `Version ${version} does not exist for deployment ${name}`
      });
    }

    const versionData = config.versions[version];
    console.log('✅ Found version data:', versionData);

    // 返回正確格式的配置
    res.json({
      config: versionData.config,  // 包含完整的配置對象
      createdAt: versionData.createdAt,
      updatedAt: versionData.updatedAt
    });

  } catch (error) {
    console.error('❌ Error handling version config request:', error);
    res.status(500).json({
      error: 'Failed to handle version config request',
      details: error.message
    });
  }
});

// Add template placeholders route
router.get('/templates/:deploymentName/placeholders', authenticateToken, async (req, res) => {
  try {
    const { deploymentName } = req.params;
    console.log('🔍 Getting placeholders for deployment:', deploymentName);
    
    // 讀取模板文件
    const templatePath = path.join(__dirname, '../deploymentTemplate', deploymentName, `${deploymentName}-template.yaml`);
    console.log('📂 Template path:', templatePath);
    
    // 檢查文件是否存在
    try {
      await fs.access(templatePath);
    } catch (error) {
      console.error('❌ Template file not found:', templatePath);
      return res.status(404).json({
        message: 'Template file not found',
        path: templatePath
      });
    }
    
    const content = await fs.readFile(templatePath, 'utf8');
    console.log('📄 Template content length:', content.length);
    
    // 解析預設值和分類
    const placeholders = [];
    const defaultValues = {};
    const categories = new Set();
    
    // 使用正則表達式查找註釋中的預設值
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // 匹配形如 #[category:key=value] 或 #[key=value] 的註釋
      const match = line.match(/#\[([\w-]+:)?([\w-]+)=([^\]]+)\]/);
      if (match) {
        const category = match[1] ? match[1].slice(0, -1) : 'default';
        const key = match[2];
        const value = match[3];
        
        console.log(`📌 Found placeholder at line ${index + 1}:`, { category, key, value });
        
        placeholders.push({
          key,
          category,
          defaultValue: value
        });
        
        defaultValues[key] = value;
        categories.add(category);
      }
    });

    console.log('✅ Parsed placeholders:', {
      count: placeholders.length,
      categories: Array.from(categories)
    });

    res.json({
      placeholders,
      defaultValues,
      categories: Array.from(categories)
    });
    
  } catch (error) {
    console.error('❌ Error getting template placeholders:', error);
    res.status(500).json({
      message: 'Failed to get template placeholders',
      error: error.message
    });
  }
});

router.post('/templates/:name/config', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const configPath = path.join(
      __dirname,
      '../deploymentTemplate',
      name,
      'config.json'
    );
    
    // 確保目錄存在
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    
    // 寫入配置
    await fs.writeFile(
      configPath,
      JSON.stringify(req.body, null, 2)
    );
    
    res.json({ message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Failed to save config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

router.get('/templates/:name/config', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const configPath = path.join(
      __dirname,
      '../deploymentTemplate',
      name,
      'config.json'
    );
    
    const config = await fs.readFile(configPath, 'utf8');
    res.json(JSON.parse(config));
  } catch (error) {
    console.error('Failed to read config:', error);
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

// 添加儲存配置相關路由
router.post('/templates/:name/storage', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { version, storageClassYaml, persistentVolumeYaml } = req.body;
    
    // 確保目錄存在
    const storageDir = path.join(
      __dirname,
      '../deploymentTemplate',
      name,
      'storage'
    );
    await fs.mkdir(storageDir, { recursive: true });
    
    // 保存 StorageClass YAML
    const storageClassPath = path.join(
      storageDir,
      `${name}-${version}-storageClass.yaml`
    );
    await fs.writeFile(storageClassPath, storageClassYaml);
    
    // 保存 PersistentVolume YAML
    const pvPath = path.join(
      storageDir,
      `${name}-${version}-persistentVolumes.yaml`
    );
    await fs.writeFile(pvPath, persistentVolumeYaml);
    
    res.json({
      message: 'Storage configuration saved successfully',
      files: {
        storageClass: storageClassPath,
        persistentVolume: pvPath
      }
    });
  } catch (error) {
    console.error('Failed to save storage configuration:', error);
    res.status(500).json({
      error: 'Failed to save storage configuration',
      details: error.message
    });
  }
});

// 獲取儲存配置
router.get('/templates/:name/storage/:version', authenticateToken, async (req, res) => {
  try {
    const { name, version } = req.params;
    const storageDir = path.join(
      __dirname,
      '../deploymentTemplate',
      name,
      'storage'
    );
    
    const storageClassPath = path.join(
      storageDir,
      `${name}-${version}-storageClass.yaml`
    );
    const pvPath = path.join(
      storageDir,
      `${name}-${version}-persistentVolumes.yaml`
    );
    
    const [storageClassYaml, persistentVolumeYaml] = await Promise.all([
      fs.readFile(storageClassPath, 'utf8').catch(() => ''),
      fs.readFile(pvPath, 'utf8').catch(() => '')
    ]);
    
    res.json({
      storageClassYaml,
      persistentVolumeYaml
    });
  } catch (error) {
    console.error('Failed to read storage configuration:', error);
    res.status(500).json({
      error: 'Failed to read storage configuration',
      details: error.message
    });
  }
});

// 修改版本配置路由
router.get('/:name/versions/:version/config', authenticateToken, async (req, res) => {
  try {
    const { name, version } = req.params;
    console.log('🔍 Getting config for deployment:', name, 'version:', version);

    const deploymentDir = path.join(__dirname, '../deploymentTemplate', name);
    const configPath = path.join(deploymentDir, 'config.json');
    console.log('📂 Config path:', configPath);

    // 檢查目錄是否存在，不存在則創建
    await fs.mkdir(deploymentDir, { recursive: true });

    // 檢查配置文件是否存在
    let config;
    try {
      const configFile = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(configFile);
      console.log('📄 Found existing config file:', config);
    } catch (error) {
      // 如果文件不存在或無法解析，創建新的配置
      console.log('📝 Creating new config file');
      config = {
        name,
        versions: {
          [version]: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            config: {
              name,
              version,
              namespace: 'default',
              enableResourceQuota: false,
              resourceQuota: {
                requestsCpu: '1',
                requestsMemory: '1Gi',
                limitsCpu: '2',
                limitsMemory: '2Gi',
                pods: '10',
                configmaps: '10',
                pvcs: '5',
                services: '10',
                secrets: '10',
                deployments: '5',
                replicasets: '10',
                statefulsets: '5',
                jobs: '10',
                cronjobs: '5'
              }
            }
          }
        },
        latestVersion: version
      };

      // 保存新配置文件
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      console.log('✅ Created new config file');
    }

    // 檢查請求的版本是否存在
    if (!config.versions[version]) {
      return res.status(404).json({
        error: 'Version not found',
        details: `Version ${version} does not exist for deployment ${name}`
      });
    }

    const versionData = config.versions[version];
    console.log('✅ Found version data:', versionData);

    // 返回正確格式的配置
    res.json({
      config: versionData.config,  // 包含完整的配置對象
      createdAt: versionData.createdAt,
      updatedAt: versionData.updatedAt
    });

  } catch (error) {
    console.error('❌ Error handling version config request:', error);
    res.status(500).json({
      error: 'Failed to handle version config request',
      details: error.message
    });
  }
});

module.exports = router; 