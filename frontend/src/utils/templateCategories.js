// 模板分類定義
export const TEMPLATE_CATEGORIES = {
  APPLICATION: 'application',
  DATABASE: 'database',
  MIDDLEWARE: 'middleware',
  MONITORING: 'monitoring',
  CUSTOM: 'custom'
};

// 預設模板
export const DEFAULT_TEMPLATES = {
  [TEMPLATE_CATEGORIES.APPLICATION]: [
    {
      name: 'Web Application',
      description: '基本的 Web 應用部署配置',
      config: {
        type: 'deployment',
        replicas: 2,
        resources: {
          requests: {
            cpu: '100m',
            memory: '128Mi'
          },
          limits: {
            cpu: '200m',
            memory: '256Mi'
          }
        }
      }
    }
  ],
  [TEMPLATE_CATEGORIES.DATABASE]: [
    {
      name: 'MySQL Database',
      description: 'MySQL 數據庫部署配置',
      config: {
        type: 'statefulset',
        replicas: 1,
        resources: {
          requests: {
            cpu: '500m',
            memory: '1Gi'
          },
          limits: {
            cpu: '1',
            memory: '2Gi'
          }
        }
      }
    }
  ]
};

// 獲取模板分類
export const getTemplateCategories = () => {
  return Object.entries(TEMPLATE_CATEGORIES).map(([key, value]) => ({
    id: value,
    name: key.toLowerCase().replace(/_/g, ' ')
  }));
};

// 根據分類獲取模板
export const getTemplatesByCategory = (category) => {
  const templates = JSON.parse(localStorage.getItem('podTemplates') || '[]');
  return templates.filter(t => t.category === category);
};

// 保存模板
export const saveTemplate = (template) => {
  const templates = JSON.parse(localStorage.getItem('podTemplates') || '[]');
  const updatedTemplates = [...templates, template];
  localStorage.setItem('podTemplates', JSON.stringify(updatedTemplates));
};

// 刪除模板
export const deleteTemplate = (templateName) => {
  const templates = JSON.parse(localStorage.getItem('podTemplates') || '[]');
  const updatedTemplates = templates.filter(t => t.name !== templateName);
  localStorage.setItem('podTemplates', JSON.stringify(updatedTemplates));
}; 