const k8sService = require('../services/k8sService');
const opensearchClient = require('../utils/opensearchClient');
const fs = require('fs').promises;
const path = require('path');

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
  getTemplateList
}; 