const opensearchClient = require('../utils/opensearchClient');
const { v4: uuidv4 } = require('uuid');

// 從環境變量獲取索引名稱
const TEMPLATE_INDEX = process.env.OPENSEARCH_TEMPLATE_INDEX || 'pod-deployment-templates';

class TemplateService {
  constructor() {
    this.initIndex();
  }

  // 初始化索引
  async initIndex() {
    try {
      const indexExists = await opensearchClient.indices.exists({
        index: TEMPLATE_INDEX
      });

      if (!indexExists.body) {
        await opensearchClient.indices.create({
          index: TEMPLATE_INDEX,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 1
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: { type: 'text' },
                description: { type: 'text' },
                category: { type: 'keyword' },
                version: { type: 'keyword' },
                config: { type: 'object' },
                createdBy: { type: 'keyword' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                isLatest: { type: 'boolean' },
                parentId: { type: 'keyword' }
              }
            }
          }
        });
        console.log(`✅ Template index ${TEMPLATE_INDEX} created`);
      }
    } catch (error) {
      console.error(`❌ Failed to initialize template index ${TEMPLATE_INDEX}:`, error);
      throw error;
    }
  }

  // 保存模板
  async saveTemplate(template, userId) {
    try {
      const templateId = uuidv4();
      const now = new Date().toISOString();

      const templateDoc = {
        id: templateId,
        name: template.name,
        description: template.description,
        category: template.category,
        version: '1.0',
        config: template.config,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        isLatest: true,
        parentId: null
      };

      await opensearchClient.index({
        index: TEMPLATE_INDEX,
        body: templateDoc,
        refresh: true
      });

      return templateId;
    } catch (error) {
      console.error('❌ Failed to save template:', error);
      throw error;
    }
  }

  // 更新模板（創建新版本）
  async updateTemplate(templateId, template, userId) {
    try {
      // 獲取當前版本
      const currentTemplate = await this.getTemplateById(templateId);
      if (!currentTemplate) {
        throw new Error('Template not found');
      }

      // 將當前版本標記為非最新
      await opensearchClient.updateByQuery({
        index: TEMPLATE_INDEX,
        body: {
          script: {
            source: 'ctx._source.isLatest = false'
          },
          query: {
            term: { id: templateId }
          }
        },
        refresh: true
      });

      // 創建新版本
      const newVersion = this.incrementVersion(currentTemplate.version);
      const now = new Date().toISOString();

      const newTemplateDoc = {
        id: uuidv4(),
        name: template.name || currentTemplate.name,
        description: template.description || currentTemplate.description,
        category: template.category || currentTemplate.category,
        version: newVersion,
        config: template.config,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        isLatest: true,
        parentId: templateId
      };

      await opensearchClient.index({
        index: TEMPLATE_INDEX,
        body: newTemplateDoc,
        refresh: true
      });

      return newTemplateDoc.id;
    } catch (error) {
      console.error('❌ Failed to update template:', error);
      throw error;
    }
  }

  // 獲取模板版本歷史
  async getTemplateHistory(templateId) {
    try {
      const { body } = await opensearchClient.search({
        index: TEMPLATE_INDEX,
        body: {
          query: {
            bool: {
              should: [
                { term: { id: templateId } },
                { term: { parentId: templateId } }
              ]
            }
          },
          sort: [
            { createdAt: { order: 'desc' } }
          ]
        }
      });

      return body.hits.hits.map(hit => hit._source);
    } catch (error) {
      console.error('❌ Failed to get template history:', error);
      throw error;
    }
  }

  // 按類別獲取模板
  async getTemplatesByCategory(category) {
    try {
      const { body } = await opensearchClient.search({
        index: TEMPLATE_INDEX,
        body: {
          query: {
            bool: {
              must: [
                { term: { category } },
                { term: { isLatest: true } }
              ]
            }
          },
          sort: [
            { createdAt: { order: 'desc' } }
          ]
        }
      });

      return body.hits.hits.map(hit => hit._source);
    } catch (error) {
      console.error('❌ Failed to get templates by category:', error);
      throw error;
    }
  }

  // 導出模板
  async exportTemplate(templateId) {
    try {
      const template = await this.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      return {
        version: template.version,
        template: {
          name: template.name,
          description: template.description,
          category: template.category,
          config: template.config
        },
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to export template:', error);
      throw error;
    }
  }

  // 導入模板
  async importTemplate(templateData, userId) {
    try {
      const template = {
        name: templateData.template.name,
        description: templateData.template.description,
        category: templateData.template.category,
        config: templateData.template.config
      };

      return await this.saveTemplate(template, userId);
    } catch (error) {
      console.error('❌ Failed to import template:', error);
      throw error;
    }
  }

  // 輔助方法：遞增版本號
  incrementVersion(version) {
    const parts = version.split('.');
    parts[parts.length - 1] = parseInt(parts[parts.length - 1]) + 1;
    return parts.join('.');
  }

  // 輔助方法：根據 ID 獲取模板
  async getTemplateById(templateId) {
    try {
      const { body } = await opensearchClient.search({
        index: TEMPLATE_INDEX,
        body: {
          query: {
            term: { id: templateId }
          }
        }
      });

      if (body.hits.total.value === 0) {
        return null;
      }

      return body.hits.hits[0]._source;
    } catch (error) {
      console.error('❌ Failed to get template by ID:', error);
      throw error;
    }
  }
}

module.exports = new TemplateService(); 