const templateService = require('../services/templateService');
const { validateTemplate } = require('../utils/podValidation');

// 保存模板
const saveTemplate = async (req, res) => {
  try {
    const { template } = req.body;
    const { isValid, errors } = validateTemplate(template);
    
    if (!isValid) {
      return res.status(400).json({ errors });
    }

    const templateId = await templateService.saveTemplate(template, req.user.id);
    res.json({ id: templateId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 更新模板
const updateTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { template } = req.body;
    
    const { isValid, errors } = validateTemplate(template);
    if (!isValid) {
      return res.status(400).json({ errors });
    }

    const newTemplateId = await templateService.updateTemplate(templateId, template, req.user.id);
    res.json({ id: newTemplateId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 獲取模板歷史
const getTemplateHistory = async (req, res) => {
  try {
    const { templateId } = req.params;
    const history = await templateService.getTemplateHistory(templateId);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 按類別獲取模板
const getTemplatesByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    const templates = await templateService.getTemplatesByCategory(category);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 導出模板
const exportTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const exportData = await templateService.exportTemplate(templateId);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 導入模板
const importTemplate = async (req, res) => {
  try {
    const { template } = req.body;
    const templateId = await templateService.importTemplate(template, req.user.id);
    res.json({ id: templateId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  saveTemplate,
  updateTemplate,
  getTemplateHistory,
  getTemplatesByCategory,
  exportTemplate,
  importTemplate
}; 