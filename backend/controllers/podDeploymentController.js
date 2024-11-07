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
    const preview = k8sService.generateDeploymentPreview(config);
    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config
    };

    // Update latest version if newer
    if (!deploymentConfig.latestVersion || 
        semver.gt(version, deploymentConfig.latestVersion)) {
      deploymentConfig.latestVersion = version;
    }

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
    const { name, version } = req.params;
    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');

    const configFile = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);

    if (!config.versions[version]) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(config.versions[version]);
  } catch (error) {
    console.error('Failed to get version config:', error);
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
  validateRepositoryConfig
}; 