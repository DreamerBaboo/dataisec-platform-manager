const k8sService = require('../services/k8sService');
const opensearchClient = require('../utils/opensearchClient');
const fs = require('fs').promises;
const path = require('path');
const semver = require('semver');
const YAML = require('yaml');

// 生成部署預覽
const generatePreview = async (req, res) => {
  try {
    const config = req.body;
    
    // 驗證配置
    const validations = [
      validateStorageConfig(config),
      validateRepositoryConfig(config),
      // 其他驗證...
    ];
    
    const errors = validations
      .filter(v => !v.isValid)
      .reduce((acc, v) => ({ ...acc, ...v.errors }), {});
    
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }
    
    // 生成完整配置
    const fullConfig = await generateDeploymentConfig(config.name, config.version);
    
    res.json({ yaml: fullConfig });
  } catch (error) {
    console.error('Failed to generate preview:', error);
    res.status(500).json({
      error: 'Failed to generate preview',
      details: error.message
    });
  }
};

// 創建部署
const createDeployment = async (req, res) => {
  try {
    const deploymentConfig = req.body;
    const result = await k8sService.createDeployment(deploymentConfig);
    
    // 使用 opensearchClient 記錄操作
    await opensearchClient.index({
      index: 'pod-deployment-logs',
      body: {
        type: 'CREATE_DEPLOYMENT',
        user: req.user.username,
        resource: deploymentConfig.name,
        namespace: deploymentConfig.namespace,
        status: 'SUCCESS',
        config: deploymentConfig,
        timestamp: new Date()
      }
    });

    res.json(result);
  } catch (error) {
    // 記錄錯誤
    await opensearchClient.index({
      index: 'pod-deployment-logs',
      body: {
        type: 'CREATE_DEPLOYMENT',
        user: req.user.username,
        resource: req.body.name,
        namespace: req.body.namespace,
        status: 'FAILED',
        error: error.message,
        config: req.body,
        timestamp: new Date()
      }
    });

    res.status(500).json({ error: error.message });
  }
};

// 獲取部署列表
const listDeployments = async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    const deployments = await k8sService.listDeployments(namespace);
    res.json(deployments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 獲取部署詳情
const getDeployment = async (req, res) => {
  try {
    const { name, namespace = 'default' } = req.params;
    const deployment = await k8sService.getDeployment(name, namespace);
    res.json(deployment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 刪除部署
const deleteDeployment = async (req, res) => {
  try {
    const { name, namespace = 'default' } = req.params;
    await k8sService.deleteDeployment(name, namespace);
    
    // 記錄刪除操作
    await opensearchClient.index({
      index: 'pod-deployment-logs',
      body: {
        type: 'DELETE_DEPLOYMENT',
        user: req.user.username,
        resource: name,
        namespace: namespace,
        status: 'SUCCESS',
        timestamp: new Date()
      }
    });

    res.json({ message: 'Deployment deleted successfully' });
  } catch (error) {
    // 記錄錯誤
    await opensearchClient.index({
      index: 'pod-deployment-logs',
      body: {
        type: 'DELETE_DEPLOYMENT',
        user: req.user.username,
        resource: req.params.name,
        namespace: req.params.namespace,
        status: 'FAILED',
        error: error.message,
        timestamp: new Date()
      }
    });

    res.status(500).json({ error: error.message });
  }
};

// 獲取部署日誌
const getDeploymentLogs = async (req, res) => {
  try {
    const { name, namespace = 'default', container, tailLines, follow } = req.query;
    const logs = await k8sService.getPodLogs(name, namespace, {
      container,
      tailLines: parseInt(tailLines),
      follow: follow === 'true'
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 獲取容器列表
const getContainers = async (req, res) => {
  try {
    const { name, namespace = 'default' } = req.params;
    const containers = await k8sService.getPodContainers(name, namespace);
    res.json({ containers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 獲取部署狀態
const getDeploymentStatus = async (req, res) => {
  try {
    const { name, namespace = 'default' } = req.params;
    const status = await k8sService.getDeploymentStatus(name, namespace);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// WebSocket 處理部署進度
const handleDeploymentProgress = (ws, req) => {
  const { name, namespace = 'default' } = req.params;
  
  let watchClose;
  
  const sendStatus = async () => {
    try {
      const status = await k8sService.getDeploymentStatus(name, namespace);
      ws.send(JSON.stringify({ type: 'status', data: status }));
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  };

  // 開始監控
  k8sService.watchDeployment(name, namespace, (type, obj) => {
    ws.send(JSON.stringify({ type: 'update', data: obj }));
  }).then(closeWatch => {
    watchClose = closeWatch;
  });

  // 定期發送狀態更新
  const statusInterval = setInterval(sendStatus, 5000);

  // 清理
  ws.on('close', () => {
    if (watchClose) {
      watchClose();
    }
    clearInterval(statusInterval);
  });
};

// 更新導出
const getTemplateList = async (req, res) => {
  try {
    const TEMPLATE_DIR = path.join(__dirname, '../deploymentTemplate');
    console.log('📂 Getting template list from:', TEMPLATE_DIR);
    
    // Check if directory exists
    const exists = await fs.access(TEMPLATE_DIR)
      .then(() => true)
      .catch(() => false);
    
    if (!exists) {
      console.log('❌ Template directory does not exist');
      await fs.mkdir(TEMPLATE_DIR, { recursive: true });
      console.log('✅ Created template directory');
    }
    
    const templates = await fs.readdir(TEMPLATE_DIR);
    console.log('📑 Found templates:', templates);
    
    // Filter out non-directory items and hidden files
    const templateDirs = await Promise.all(templates
      .filter(name => !name.startsWith('.'))
      .map(async (name) => {
        const templatePath = path.join(TEMPLATE_DIR, name);
        const stats = await fs.stat(templatePath);
        return stats.isDirectory() ? name : null;
      }));

    const validTemplates = templateDirs.filter(Boolean);
    console.log('✅ Valid template directories:', validTemplates);
    
    // Get details for each template
    const templateDetails = await Promise.all(validTemplates.map(async (name) => {
      const templatePath = path.join(TEMPLATE_DIR, name);
      const stats = await fs.stat(templatePath);
      
      // Look for template YAML file
      const files = await fs.readdir(templatePath);
      const templateFile = files.find(file => file.endsWith('-template.yaml') || file.endsWith('-template.yml'));
      
      return {
        name,
        path: templatePath,
        templateFile: templateFile ? path.join(templatePath, templateFile) : null,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    }));

    console.log('✅ Template details:', templateDetails);
    res.json(templateDetails);
  } catch (error) {
    console.error('❌ Error getting template list:', error);
    res.status(500).json({ 
      message: 'Failed to get template list',
      error: error.message 
    });
  }
};

// Save deployment configuration
const saveDeploymentConfig = async (req, res) => {
  try {
    const { name, version, config } = req.body;
    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');

    // Read existing config or create new one
    let deploymentConfig;
    try {
      const existingConfig = await fs.readFile(configPath, 'utf8');
      deploymentConfig = JSON.parse(existingConfig);
    } catch (error) {
      deploymentConfig = {
        name,
        versions: {},
        latestVersion: version
      };
    }

    // Add new version
    deploymentConfig.versions[version] = {
      createdAt: deploymentConfig.versions[version]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config
    };

    // Update latest version if newer
    if (!deploymentConfig.latestVersion || 
        semver.gt(version, deploymentConfig.latestVersion)) {
      deploymentConfig.latestVersion = version;
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    // Save configuration
    await fs.writeFile(configPath, JSON.stringify(deploymentConfig, null, 2));

    res.json({
      message: 'Configuration saved successfully',
      version
    });
  } catch (error) {
    console.error('Failed to save deployment config:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new version
const createVersion = async (req, res) => {
  try {
    const { name } = req.params;
    const { version } = req.body;
    
    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');
    let config = {};
    
    try {
      config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    } catch (error) {
      config = { name, versions: {}, latestVersion: null };
    }
    
    // Add new version
    config.versions[version] = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: {
        name,
        namespace: 'default',
        templatePath: '',
        yamlConfig: null,
        resources: {},
        affinity: {},
        volumes: [],
        configMaps: [],
        secrets: [],
        enableResourceQuota: false,
        resourceQuota: null,
        version,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    config.latestVersion = version;
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    res.json({ message: 'Version created successfully', version });
  } catch (error) {
    console.error('Failed to create version:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get deployment configuration versions
const getDeploymentVersions = async (req, res) => {
  try {
    const { name } = req.params;
    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');

    const configFile = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);

    const versions = Object.keys(config.versions).map(version => ({
      version,
      createdAt: config.versions[version].createdAt,
      updatedAt: config.versions[version].updatedAt
    }));

    res.json({
      name,
      versions,
      latestVersion: config.latestVersion
    });
  } catch (error) {
    console.error('Failed to get deployment versions:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get specific version configuration
const getVersionConfig = async (req, res) => {
  try {
    const { name } = req.params;
    const { version } = req.query;
    
    if (!name || !version) {
      return res.status(400).json({ 
        error: 'Deployment name and version are required' 
      });
    }

    console.log('📥 Getting version config:', { name, version });
    
    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');
    
    // Read config file
    const configFile = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);
    
    // Check if version exists
    if (!config.versions[version]) {
      return res.status(404).json({
        error: 'Version not found'
      });
    }
    
    console.log('✅ Found version config');
    
    res.json({
      name,
      version,
      config: config.versions[version].config
    });
    
  } catch (error) {
    console.error('❌ Failed to get version config:', error);
    
    // Handle file not found error
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'Deployment configuration not found'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

// Add saveTemplateContent function
const saveTemplateContent = async (req, res) => {
  try {
    const { deploymentName } = req.params;
    
    // 直接使用接收到的內容，不進行 YAML 解析和重新格式化
    let content = req.body.content;

    if (!content || content.trim() === '') {
      console.error('❌ 沒有提供有效的內容');
      return res.status(400).json({
        message: 'Empty content received',
        receivedBody: req.body
      });
    }

    // 只驗證 YAML 是否有效，但不使用解析後的結果
    try {
      YAML.parse(content);
    } catch (yamlError) {
      console.error('❌ YAML 解析錯誤:', yamlError);
      return res.status(400).json({
        message: 'Invalid YAML content',
        error: yamlError.message
      });
    }

    // 保存原始內容
    const templateDir = path.join(__dirname, '../deploymentTemplate', deploymentName);
    await fs.mkdir(templateDir, { recursive: true });
    
    const templatePath = path.join(templateDir, `${deploymentName}-template.yaml`);
    await fs.writeFile(templatePath, content, 'utf8');

    // Update config.json
    try {
      const configPath = path.join(templateDir, 'config.json');
      let config = {};
      
      try {
        console.log('📖 Reading existing config:', configPath);
        const existingConfig = await fs.readFile(configPath, 'utf8');
        config = JSON.parse(existingConfig);
      } catch (err) {
        console.log('ℹ️ No existing config found, creating new one');
        config = {
          name: deploymentName,
          versions: {},
          latestVersion: '1.0.0'
        };
      }

      // 保存格式化後的內容
      await fs.writeFile(templatePath, content, 'utf8');
        
      // 驗證保存的內容
      const savedContent = await fs.readFile(templatePath, 'utf8');
      if (!savedContent || savedContent.trim() === '') {
        throw new Error('Content was not saved correctly');
      }

      // Add or update template content in config
      config.template = {
        content: content,
        updatedAt: new Date().toISOString()
      };

      console.log('💾 Writing updated config:', configPath);
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

      console.log('✅ Template saved successfully:', {
        path: templatePath,
        contentLength: savedContent.length
      });

      res.json({
        message: 'Template content saved successfully',
        path: templatePath,
        contentLength: savedContent.length,
        content: savedContent
      });
    } catch (configError) {
      console.error('❌ Failed to update config:', configError);
      throw configError;
    }
  } catch (error) {
    console.error('❌ 保存模板時出錯:', error);
    res.status(500).json({
      message: 'Failed to save template content',
      error: error.message
    });
  }
};

const validateRepositoryConfig = (config) => {
  const errors = {};
  
  if (!config.yamlTemplate?.placeholders?.repository) {
    errors.repository = 'Repository is required';
  }
  
  if (!config.yamlTemplate?.placeholders?.tag) {
    errors.tag = 'Tag is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// 驗證儲存配置
const validateStorageConfig = (config) => {
  const errors = {};
  
  // 驗證 StorageClass
  if (config.storageClasses) {
    config.storageClasses.forEach((sc, index) => {
      if (!sc.name) {
        errors[`storageClasses.${index}.name`] = 'Storage class name is required';
      }
      if (!sc.provisioner) {
        errors[`storageClasses.${index}.provisioner`] = 'Provisioner is required';
      }
    });
  }
  
  // 驗證 PersistentVolume
  if (config.persistentVolumes) {
    config.persistentVolumes.forEach((pv, index) => {
      if (!pv.name) {
        errors[`persistentVolumes.${index}.name`] = 'PV name is required';
      }
      if (!pv.capacity) {
        errors[`persistentVolumes.${index}.capacity`] = 'Capacity is required';
      }
      if (!pv.accessModes || pv.accessModes.length === 0) {
        errors[`persistentVolumes.${index}.accessModes`] = 'At least one access mode is required';
      }
    });
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// 生成完整的部署配置
const generateDeploymentConfig = async (name, version) => {
  const deploymentDir = path.join(__dirname, '../deploymentTemplate', name);
  const storageDir = path.join(deploymentDir, 'storage');
  
  try {
    // 讀取所有配置文件
    const [
      storageClassYaml,
      persistentVolumeYaml,
      deploymentYaml
    ] = await Promise.all([
      fs.readFile(path.join(storageDir, `${name}-${version}-storageClass.yaml`), 'utf8').catch(() => ''),
      fs.readFile(path.join(storageDir, `${name}-${version}-persistentVolumes.yaml`), 'utf8').catch(() => ''),
      fs.readFile(path.join(deploymentDir, `${name}-template.yaml`), 'utf8')
    ]);
    
    // 合併所有 YAML 文件
    const fullConfig = [
      storageClassYaml,
      persistentVolumeYaml,
      deploymentYaml
    ].filter(Boolean).join('\n---\n');
    
    return fullConfig;
  } catch (error) {
    console.error('Failed to generate deployment config:', error);
    throw error;
  }
};

const handleNamespaceChange = async (req, res) => {
  try {
    const { deploymentName, namespace } = req.body;
    
    // 檢查命名空間是否已存在
    const existingNamespaces = await k8sService.getNamespaces();
    const namespaceExists = existingNamespaces.some(ns => ns.name === namespace);
    
    if (!namespaceExists) {
      // 驗證 namespace 名稱格式
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(namespace)) {
        return res.status(400).json({
          error: 'Invalid namespace name format'
        });
      }

      // 保存 namespace YAML
      const yamlPath = await k8sService.saveNamespaceYaml(deploymentName, namespace);
      
      // 記錄操作
      await opensearchClient.index({
        index: 'pod-deployment-logs',
        body: {
          type: 'CREATE_NAMESPACE',
          user: req.user.username,
          namespace: namespace,
          deploymentName: deploymentName,
          status: 'SUCCESS',
          timestamp: new Date()
        }
      });
      
      res.json({
        message: 'Namespace configuration saved successfully',
        path: yamlPath,
        isNew: true
      });
    } else {
      res.json({
        message: 'Using existing namespace',
        exists: true,
        isNew: false
      });
    }
  } catch (error) {
    console.error('Failed to handle namespace change:', error);
    res.status(500).json({ error: error.message });
  }
};

// 添加 getNamespaces 方法
const getNamespaces = async (req, res) => {
  try {
    const namespaces = await k8sService.getNamespaces();
    res.json(namespaces);
  } catch (error) {
    console.error('Failed to get namespaces:', error);
    res.status(500).json({ 
      error: 'Failed to get namespaces',
      details: error.message 
    });
  }
};

// Save version configuration
const saveVersionConfig = async (req, res) => {
  try {
    const { name, version } = req.params;
    const { config: newConfig } = req.body;
    
    console.log('💾 Saving version config:', { name, version });
    
    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');
    
    // Read existing config
    let config;
    try {
      const existingConfig = await fs.readFile(configPath, 'utf8');
      config = JSON.parse(existingConfig);
    } catch (error) {
      if (error.code === 'ENOENT') {
        config = {
          name,
          versions: {},
          latestVersion: version
        };
      } else {
        throw error;
      }
    }
    
    // Update version config
    config.versions[version] = {
      createdAt: config.versions[version]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: {
        ...newConfig,
        name,
        version,
        updatedAt: new Date().toISOString()
      }
    };
    
    // Update latest version if newer
    if (!config.latestVersion || semver.gt(version, config.latestVersion)) {
      config.latestVersion = version;
    }
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    
    // Save updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    console.log('✅ Version config saved successfully');
    
    res.json({
      message: 'Version configuration saved successfully',
      version
    });
    
  } catch (error) {
    console.error('❌ Failed to save version config:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get storage configuration
const getStorageConfig = async (req, res) => {
  try {
    const { name } = req.params;
    const { version } = req.query;

    if (!name || !version) {
      return res.status(400).json({
        error: 'Deployment name and version are required'
      });
    }

    console.log('📥 Getting storage config:', { name, version });

    // 構建存儲配置路徑
    const storagePath = path.join(__dirname, '../deploymentTemplate', name, 'deploy-scripts');
    const storageClassPath = path.join(storagePath, `${name}-${version}-storageClass.yaml`);
    const persistentVolumePath = path.join(storagePath, `${name}-${version}-persistentVolumes.yaml`);

    let storageClassYaml = null;
    let persistentVolumeYaml = null;

    // 讀取 StorageClass 配置
    try {
      storageClassYaml = await fs.readFile(storageClassPath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // 讀取 PersistentVolume 配置
    try {
      persistentVolumeYaml = await fs.readFile(persistentVolumePath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // 如果兩個文件都不存在，返回 404
    if (!storageClassYaml && !persistentVolumeYaml) {
      return res.status(404).json({
        error: 'Storage configuration not found'
      });
    }

    console.log('✅ Storage config retrieved');

    res.json({
      storageClassYaml,
      persistentVolumeYaml
    });

  } catch (error) {
    console.error('❌ Failed to get storage config:', error);
    res.status(500).json({ error: error.message });
  }
};

// Save storage configuration
const saveStorageConfig = async (req, res) => {
  try {
    const { name, version } = req.params;
    const { storageClassYaml, persistentVolumeYaml } = req.body;

    console.log('💾 Saving storage config:', { name, version });

    // 確保存儲目錄存在
    const storagePath = path.join(__dirname, '../deploymentTemplate', name, 'deploy-scripts');
    await fs.mkdir(storagePath, { recursive: true });

    // 保存 StorageClass 配置
    if (storageClassYaml) {
      const storageClassPath = path.join(storagePath, `${name}-${version}-storageClass.yaml`);
      await fs.writeFile(storageClassPath, storageClassYaml);
    }

    // 保存 PersistentVolume 配置
    if (persistentVolumeYaml) {
      const persistentVolumePath = path.join(storagePath, `${name}-${version}-persistentVolumes.yaml`);
      await fs.writeFile(persistentVolumePath, persistentVolumeYaml);
    }

    console.log('✅ Storage config saved successfully');

    res.json({
      message: 'Storage configuration saved successfully'
    });

  } catch (error) {
    console.error('❌ Failed to save storage config:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create storage class
const createStorageClass = async (req, res) => {
  try {
    const { name, version } = req.params;
    const storageClassConfig = req.body;

    console.log('📝 Creating storage class:', { name, version, storageClassConfig });

    // 生成 StorageClass YAML
    const storageClassYaml = `apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ${name}-${version}-storageclass
provisioner: ${storageClassConfig.provisioner}
reclaimPolicy: ${storageClassConfig.reclaimPolicy}
volumeBindingMode: ${storageClassConfig.volumeBindingMode}
allowVolumeExpansion: false`;

    // 保存 StorageClass YAML
    const storagePath = path.join(__dirname, '../deploymentTemplate', name, 'deploy-scripts');
    await fs.mkdir(storagePath, { recursive: true });

    const storageClassPath = path.join(storagePath, `${name}-${version}-storageClass.yaml`);
    await fs.writeFile(storageClassPath, storageClassYaml);

    console.log('✅ Storage class created successfully');

    res.json({
      message: 'Storage class created successfully',
      storageClassYaml
    });

  } catch (error) {
    console.error('❌ Failed to create storage class:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete storage configuration
const deleteStorageConfig = async (req, res) => {
  try {
    const { name, version, type } = req.params;

    console.log('🗑️ Deleting storage config:', { name, version, type });

    // 構建存儲配置路徑
    const storagePath = path.join(__dirname, '../deploymentTemplate', name, 'deploy-scripts');
    let filesToDelete = [];

    if (type === 'all') {
      // Delete both storage class and PV files
      filesToDelete = [
        path.join(storagePath, `${name}-${version}-storageClass.yaml`),
        path.join(storagePath, `${name}-${version}-persistentVolumes.yaml`)
      ];
    } else if (type === 'storageClass') {
      filesToDelete = [path.join(storagePath, `${name}-${version}-storageClass.yaml`)];
    } else if (type === 'persistentVolume') {
      filesToDelete = [path.join(storagePath, `${name}-${version}-persistentVolumes.yaml`)];
    } else {
      return res.status(400).json({
        error: 'Invalid storage type'
      });
    }

    // Delete files
    for (const file of filesToDelete) {
      try {
        await fs.unlink(file);
        console.log(`✅ Deleted file: ${file}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }

    console.log('✅ Storage config deleted successfully');

    res.json({
      message: 'Storage configuration deleted successfully'
    });

  } catch (error) {
    console.error('❌ Failed to delete storage config:', error);
    res.status(500).json({ error: error.message });
  }
};

// Save deploy script
const saveDeployScript = async (req, res) => {
  try {
    const { name, version } = req.params;
    const { filename, content } = req.body;

    console.log('💾 Saving deploy script:', { name, version, filename });

    // Build path to deploy-scripts folder
    const deployScriptsPath = path.join(
      __dirname,
      '..',  // Go up one level from controllers
      'deploymentTemplate',
      name,
      'deploy-scripts'
    );

    // Ensure deploy-scripts directory exists
    await fs.mkdir(deployScriptsPath, { recursive: true });

    const filePath = path.join(deployScriptsPath, filename);
    await fs.writeFile(filePath, content);

    console.log('✅ Deploy script saved successfully at:', filePath);

    res.json({
      message: 'Deploy script saved successfully',
      path: filePath
    });
  } catch (error) {
    console.error('❌ Failed to save deploy script:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get ConfigMap configuration
const getConfigMapConfig = async (req, res) => {
  try {
    const { name } = req.params;
    const { version } = req.query;

    if (!name || !version) {
      return res.status(400).json({
        error: 'Deployment name and version are required'
      });
    }

    console.log('📥 Getting ConfigMap config:', { name, version });

    // Read config.json first
    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');
    const configFile = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);

    // Get ConfigMap YAML if it exists
    const deployScriptsPath = path.join(__dirname, '../deploymentTemplate', name, 'deploy-scripts');
    const configMapPath = path.join(deployScriptsPath, `${name}-${version}-configmap.yaml`);

    let configMapYaml = null;
    try {
      configMapYaml = await fs.readFile(configMapPath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Get ConfigMaps from config.json
    const configMaps = config.versions[version]?.config?.configMaps || [];

    console.log('✅ ConfigMap config retrieved');

    res.json({
      configMaps,
      configMapYaml
    });

  } catch (error) {
    console.error('❌ Failed to get ConfigMap config:', error);
    res.status(500).json({ error: error.message });
  }
};

// Save ConfigMap configuration
const saveConfigMapConfig = async (req, res) => {
  try {
    const { name, version } = req.params;
    const { configMaps, configMapYaml } = req.body;

    console.log('💾 Saving ConfigMap config:', { name, version });

    // Save to config.json
    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');
    const configFile = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);

    if (!config.versions[version]) {
      return res.status(404).json({
        error: 'Version not found'
      });
    }

    // Update ConfigMaps in config
    config.versions[version].config = {
      ...config.versions[version].config,
      configMaps
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Save YAML file if provided
    if (configMapYaml) {
      const deployScriptsPath = path.join(__dirname, '../deploymentTemplate', name, 'deploy-scripts');
      await fs.mkdir(deployScriptsPath, { recursive: true });

      const yamlPath = path.join(deployScriptsPath, `${name}-${version}-configmap.yaml`);
      await fs.writeFile(yamlPath, configMapYaml);
    }

    console.log('✅ ConfigMap config saved successfully');

    res.json({
      message: 'ConfigMap configuration saved successfully'
    });

  } catch (error) {
    console.error('❌ Failed to save ConfigMap config:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete deploy script
const deleteDeployScript = async (req, res) => {
  try {
    const { name, version, filename } = req.params;

    console.log('🗑️ Deleting deploy script:', { name, version, filename });

    const filePath = path.join(
      __dirname,
      '..',  // Go up one level from controllers
      'deploymentTemplate',
      name,
      'deploy-scripts',
      filename
    );

    try {
      await fs.unlink(filePath);
      console.log('✅ Deploy script deleted:', filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️ File does not exist:', filePath);
        return res.json({
          message: 'File does not exist or already deleted',
          path: filePath
        });
      }
      throw error;
    }

    res.json({
      message: 'Deploy script deleted successfully',
      path: filePath
    });
  } catch (error) {
    console.error('❌ Failed to delete deploy script:', error);
    res.status(500).json({ error: error.message });
  }
};

// List deploy scripts
const listDeployScripts = async (req, res) => {
  try {
    const { name, version } = req.params;

    console.log('📋 Listing deploy scripts:', { name, version });

    const deployScriptsPath = path.join(
      __dirname,
      '..',  // Go up one level from controllers
      'deploymentTemplate',
      name,
      'deploy-scripts'
    );

    try {
      const files = await fs.readdir(deployScriptsPath);
      const yamlFiles = files.filter(file => 
        file.startsWith(`${name}-${version}-`) && 
        (file.endsWith('.yaml') || file.endsWith('.yml'))
      );

      console.log('✅ Found deploy scripts:', yamlFiles);
      res.json(yamlFiles);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️ No deploy-scripts directory found');
        return res.json([]);
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Failed to list deploy scripts:', error);
    res.status(500).json({ error: error.message });
  }
};

// Add new method to read YAML files
const getDeploymentYaml = async (req, res) => {
  try {
    const { name, version, type } = req.params;
    
    // Map type to filename
    const fileMap = {
      quota: `${name}-${version}-quota.yaml`,
      storageClass: `${name}-${version}-storageClass.yaml`,
      persistentVolume: `${name}-${version}-persistentVolumes.yaml`,
      configMap: `${name}-${version}-configmap.yaml`,
      secret: `${name}-${version}-secret.yaml`,
      final: `${name}-${version}-final.yaml`
    };

    const filename = fileMap[type];
    if (!filename) {
      return res.status(400).json({ error: 'Invalid YAML type' });
    }

    const filePath = path.join(
      __dirname,
      '../deploymentTemplate',
      name,
      'deploy-scripts',
      filename
    );

    try {
      const content = await fs.readFile(filePath, 'utf8');
      res.json({ content });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'YAML file not found' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to get deployment YAML:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get deploy script
const getDeployScript = async (req, res) => {
  try {
    const { name, version, filename } = req.params;
    
    console.log('📥 Getting deploy script:', { name, version, filename });

    // Build path to deploy-scripts folder
    const deployScriptsPath = path.join(
      __dirname,
      '..',  // Go up one level from controllers
      'deploymentTemplate',
      name,
      'deploy-scripts'
    );

    // Ensure deploy-scripts directory exists
    try {
      await fs.mkdir(deployScriptsPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create deploy-scripts directory:', error);
    }

    const filePath = path.join(deployScriptsPath, filename);
    console.log('Looking for file at:', filePath);

    try {
      const content = await fs.readFile(filePath, 'utf8');
      console.log('✅ Deploy script found and read successfully');
      res.json({ content });
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️ File not found:', filePath);
        return res.status(404).json({
          error: 'Deploy script not found',
          path: filePath
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Failed to get deploy script:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  generatePreview,
  createDeployment,
  listDeployments,
  getDeployment,
  deleteDeployment,
  getDeploymentLogs,
  getContainers,
  getDeploymentStatus,
  handleDeploymentProgress,
  getTemplateList,
  saveDeploymentConfig,
  getDeploymentVersions,
  getVersionConfig,
  saveTemplateContent,
  validateRepositoryConfig,
  validateStorageConfig,
  generateDeploymentConfig,
  handleNamespaceChange,
  getNamespaces,
  createVersion,
  saveVersionConfig,
  getStorageConfig,
  saveStorageConfig,
  createStorageClass,
  deleteStorageConfig,
  saveDeployScript,
  getConfigMapConfig,
  saveConfigMapConfig,
  deleteDeployScript,
  getDeploymentYaml,
  getDeployScript,
  listDeployScripts
}; 