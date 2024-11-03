const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const templateService = require('./templateService');

class TemplateScanService {
  constructor() {
    this.templateDir = path.join(__dirname, '../deploymentTemplate');
  }

  // 掃描模板目錄
  async scanTemplates() {
    try {
      const templates = [];
      const categories = await fs.readdir(this.templateDir);

      for (const category of categories) {
        const categoryPath = path.join(this.templateDir, category);
        const stat = await fs.stat(categoryPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(categoryPath);
          
          // 尋找主要的配置文件
          const configFile = files.find(f => 
            f.endsWith('values.yaml') || 
            f.endsWith('deployment.yaml') || 
            f.endsWith('config.yaml')
          );

          if (configFile) {
            const template = await this.processTemplate(category, configFile, categoryPath);
            if (template) {
              templates.push(template);
            }
          }
        }
      }

      await this.saveTemplates(templates);
      return templates;
    } catch (error) {
      console.error('❌ Error scanning templates:', error);
      throw error;
    }
  }

  // 處理單個模板
  async processTemplate(category, configFile, categoryPath) {
    try {
      const configContent = await fs.readFile(path.join(categoryPath, configFile), 'utf8');
      const config = yaml.load(configContent);

      // 讀取 README.md 獲取描述信息
      let description = '';
      try {
        const readmePath = path.join(categoryPath, 'README.md');
        description = await fs.readFile(readmePath, 'utf8');
      } catch (error) {
        description = `Template for ${category}`;
      }

      // 檢查是否存在部署腳本
      const hasDeployScript = await this.checkDeployScript(categoryPath);

      return {
        name: category,
        description: description,
        category: this.determineCategory(category, config),
        config: {
          ...config,
          type: this.determineDeploymentType(config),
          deploymentMethod: hasDeployScript ? 'script' : 'kubectl'
        },
        version: '1.0',
        isDefault: true,
        source: 'system',
        files: await this.getTemplateFiles(categoryPath)
      };
    } catch (error) {
      console.error(`❌ Error processing template ${category}:`, error);
      return null;
    }
  }

  // 確定部署類型
  determineDeploymentType(config) {
    if (config.kind) {
      return config.kind.toLowerCase();
    }
    return 'deployment';
  }

  // 確定模板類別
  determineCategory(name, config) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('database') || lowerName.includes('db')) {
      return 'DATABASE';
    }
    if (lowerName.includes('monitoring') || lowerName.includes('metrics')) {
      return 'MONITORING';
    }
    if (lowerName.includes('middleware') || lowerName.includes('cache')) {
      return 'MIDDLEWARE';
    }
    return 'APPLICATION';
  }

  // 檢查部署腳本
  async checkDeployScript(categoryPath) {
    try {
      const files = await fs.readdir(categoryPath);
      return files.some(f => 
        f.endsWith('.sh') || 
        f.endsWith('deploy.yaml') || 
        f.endsWith('helm-values.yaml')
      );
    } catch (error) {
      return false;
    }
  }

  // 獲取模板相關文件
  async getTemplateFiles(categoryPath) {
    const files = await fs.readdir(categoryPath);
    const templateFiles = {};

    for (const file of files) {
      if (file === 'README.md') continue;

      const filePath = path.join(categoryPath, file);
      const content = await fs.readFile(filePath, 'utf8');
      templateFiles[file] = content;
    }

    return templateFiles;
  }

  // 保存掃描到的模板
  async saveTemplates(templates) {
    try {
      for (const template of templates) {
        // 檢查模板是否已存在
        const existingTemplate = await templateService.findTemplateByName(template.name);
        
        if (!existingTemplate) {
          await templateService.saveTemplate(template, 'system');
          console.log(`✅ Template ${template.name} saved successfully`);
        } else {
          // 更新現有模板
          await templateService.updateTemplate(
            existingTemplate.id,
            { ...template, isLatest: true },
            'system'
          );
          console.log(`✅ Template ${template.name} updated successfully`);
        }
      }
    } catch (error) {
      console.error('❌ Error saving templates:', error);
      throw error;
    }
  }

  // 初始化系統模板
  async initializeSystemTemplates() {
    try {
      console.log('🔄 Scanning deployment templates...');
      const templates = await this.scanTemplates();
      console.log(`✅ Successfully initialized ${templates.length} system templates`);
      return templates;
    } catch (error) {
      console.error('❌ Failed to initialize system templates:', error);
      throw error;
    }
  }
}

module.exports = new TemplateScanService(); 