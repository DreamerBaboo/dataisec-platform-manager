const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const podDeploymentController = require('../controllers/podDeploymentController');
const path = require('path');
const fs = require('fs').promises;
const yaml = require('js-yaml');

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

// Add template content save route with better error handling
router.put('/templates/:deploymentName/template', authenticateToken, async (req, res) => {
  try {
    const { deploymentName } = req.params;
    // Get the raw content from the request body
    const content = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2);

    console.log('💾 Saving template content for:', deploymentName);
    
    // Ensure the deployment template directory exists
    const templateDir = path.join(__dirname, '../deploymentTemplate', deploymentName);
    try {
      await fs.access(templateDir);
    } catch (error) {
      console.log('📁 Creating template directory:', templateDir);
      await fs.mkdir(templateDir, { recursive: true });
    }
    
    // Define template file path
    const templatePath = path.join(templateDir, `${deploymentName}-template.yaml`);
    
    // Validate YAML content
    try {
      console.log('🔍 Validating YAML content');
      yaml.load(content);
    } catch (yamlError) {
      console.error('❌ Invalid YAML content:', yamlError);
      return res.status(400).json({
        message: 'Invalid YAML content',
        error: yamlError.message
      });
    }
    
    // Save template content
    console.log('💾 Writing template file:', templatePath);
    await fs.writeFile(templatePath, content, 'utf8');
    
    // Update config.json if it exists
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

      // Add or update template content in config
      if (!config.template) {
        config.template = {
          content: content,
          updatedAt: new Date().toISOString()
        };
      } else {
        config.template.content = content;
        config.template.updatedAt = new Date().toISOString();
      }

      console.log('💾 Writing updated config:', configPath);
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (configError) {
      console.warn('⚠️ Failed to update config.json:', configError);
      // Don't fail the whole operation if config update fails
    }
    
    console.log('✅ Template content saved successfully');
    res.json({
      message: 'Template content saved successfully',
      path: templatePath
    });
  } catch (error) {
    console.error('❌ Error saving template content:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Failed to save template content',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');
    console.log('📂 Config path:', configPath);

    // Check if config file exists
    const exists = await fs.access(configPath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.log('❌ Config file not found');
      return res.status(404).json({
        error: 'Deployment configuration not found',
        details: `No config.json found for deployment: ${name}`
      });
    }

    const configFile = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);

    const versions = Object.keys(config.versions).map(version => ({
      version,
      createdAt: config.versions[version].createdAt,
      updatedAt: config.versions[version].updatedAt
    }));

    console.log('✅ Found versions:', versions);
    res.json({
      name,
      versions,
      latestVersion: config.latestVersion
    });
  } catch (error) {
    console.error('❌ Failed to get deployment versions:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({
        error: 'Deployment not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to get deployment versions',
        details: error.message
      });
    }
  }
});

// Get specific version configuration
router.get('/:name/versions/:version', authenticateToken, async (req, res) => {
  try {
    const { name, version } = req.params;
    console.log('🔍 Getting config for deployment:', name, 'version:', version);

    const configPath = path.join(__dirname, '../deploymentTemplate', name, 'config.json');
    console.log('📂 Config path:', configPath);

    const configFile = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configFile);

    if (!config.versions[version]) {
      console.log('❌ Version not found:', version);
      return res.status(404).json({
        error: 'Version not found',
        details: `Version ${version} not found for deployment ${name}`
      });
    }

    console.log('✅ Found configuration for version:', version);
    res.json(config.versions[version]);
  } catch (error) {
    console.error('❌ Failed to get version config:', error);
    if (error.code === 'ENOENT') {
      res.status(404).json({
        error: 'Deployment or version not found',
        details: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to get version configuration',
        details: error.message
      });
    }
  }
});

// Get template placeholders
router.get('/templates/:deploymentName/placeholders', authenticateToken, async (req, res) => {
  try {
    const { deploymentName } = req.params;
    console.log('🔍 Getting placeholders for template:', deploymentName);

    const templatePath = path.join(__dirname, '../deploymentTemplate', deploymentName, `${deploymentName}-template.yaml`);
    console.log('📂 Template path:', templatePath);

    // Read and parse template file
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const template = yaml.load(templateContent);

    // Extract placeholders
    const placeholders = {};
    const defaultValues = {};
    const categories = {
      basic: [],
      image: [],
      service: [],
      resources: [],
      deployment: [],
      node: [],
      misc: []
    };

    // Function to extract placeholders from string
    const extractPlaceholders = (str) => {
      const matches = str.match(/\${([^}]+)}/g) || [];
      return matches.map(match => {
        const placeholder = match.slice(2, -1);
        // Check for default values
        if (placeholder.includes('#')) {
          const [name, defaults] = placeholder.split('#');
          const values = defaults.match(/\[(.*?)\]/)?.[1].split(',').map(v => v.trim()) || [];
          defaultValues[name] = values;
          return name;
        }
        return placeholder;
      });
    };

    // Function to categorize placeholder
    const categorizeField = (field) => {
      const fieldLower = field.toLowerCase();
      if (fieldLower.includes('name') || fieldLower.includes('namespace')) return 'basic';
      if (fieldLower.includes('image') || fieldLower.includes('repository') || fieldLower.includes('tag')) return 'image';
      if (fieldLower.includes('service') || fieldLower.includes('port')) return 'service';
      if (fieldLower.includes('cpu') || fieldLower.includes('memory')) return 'resources';
      if (fieldLower.includes('replica') || fieldLower.includes('deployment')) return 'deployment';
      if (fieldLower.includes('node') || fieldLower.includes('affinity')) return 'node';
      return 'misc';
    };

    // Recursively search for placeholders in object
    const searchPlaceholders = (obj) => {
      if (typeof obj === 'string') {
        const found = extractPlaceholders(obj);
        found.forEach(placeholder => {
          placeholders[placeholder] = '';
          const category = categorizeField(placeholder);
          if (!categories[category].includes(placeholder)) {
            categories[category].push(placeholder);
          }
        });
      } else if (Array.isArray(obj)) {
        obj.forEach(item => searchPlaceholders(item));
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => searchPlaceholders(value));
      }
    };

    searchPlaceholders(template);

    console.log('✅ Found placeholders:', {
      placeholders,
      defaultValues,
      categories
    });

    res.json({
      placeholders,
      defaultValues,
      categories
    });
  } catch (error) {
    console.error('❌ Error getting template placeholders:', error);
    res.status(500).json({
      message: 'Failed to get template placeholders',
      error: error.message
    });
  }
});

module.exports = router; 