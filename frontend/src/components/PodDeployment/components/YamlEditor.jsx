import React, { useState, useEffect } from 'react';
import { logger } from '../../../utils/logger';
import yaml from 'js-yaml';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Box,
  CircularProgress,
  FormControl,
  FormLabel
} from '@mui/material';
import Editor from '@monaco-editor/react';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import templateService from '../../../services/templateService';

// Custom Monaco Editor wrapper with default parameters
const CustomMonacoEditor = ({
  height = '100%',
  language = 'yaml',
  theme = 'vs-dark',
  value = '',
  onChange,
  options = {
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    wrappingIndent: 'indent'
  },
  ...props
}) => (
  <Editor
    height={height}
    language={language}
    theme={theme}
    value={value}
    onChange={onChange}
    options={options}
    {...props}
  />
);

const YamlEditor = ({ 
  open, 
  onClose, 
  content, 
  deploymentName, 
  templateFile,
  onSave,
  onTemplateChange,
  error 
}) => {
  const { t } = useAppTranslation();
  const [editedContent, setEditedContent] = useState(content);
  const [saving, setSaving] = useState(false);
  const [localError, setError] = useState(error);

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const validateYaml = (content) => {
    try {
      if (!content || content.trim() === '') {
        throw new Error('Template content cannot be empty');
      }
      yaml.load(content);
      return true;
    } catch (error) {
      setError(`Invalid YAML: ${error.message}`);
      return false;
    }
  };

  const handleSave = async () => {
    try {
      if (!deploymentName) {
        setError('Deployment name is required');
        return;
      }

      // Validate YAML before saving
      if (!validateYaml(editedContent)) {
        return;
      }

      logger.info('開始保存模板內容', { 
        deploymentName,
        contentLength: editedContent.length,
        contentPreview: editedContent.substring(0, 100)
      });
      
      setSaving(true);
      setError(null);

      // Save template content
      await templateService.saveTemplateContent(
        deploymentName,
        editedContent
      );
      logger.info('模板內容保存成功');

      // Call onSave callback with the edited content
      if (onSave) {
        await onSave(editedContent);
        logger.info('onSave 回調執行成功');
      }
      
      try {
        logger.info('正在分析模板佔位符', { deploymentName });
        // Analyze template for new placeholders
        const { placeholders, defaultValues, categories } = 
          await templateService.getTemplatePlaceholders(deploymentName);

        logger.info('模板佔位符分析完成', { 
          placeholdersCount: Object.keys(placeholders).length,
          defaultValuesCount: Object.keys(defaultValues).length,
          categoriesCount: categories?.length
        });

        // Trigger template refresh in parent component
        if (onTemplateChange) {
          await onTemplateChange({
            content: editedContent,
            placeholders,
            defaultValues,
            categories
          });
        }
      } catch (error) {
        logger.error('分析模板佔位符失敗', error);
        setError('Failed to analyze template placeholders');
      }
    } catch (error) {
      logger.error('保存模板失敗', { 
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        deploymentName 
      });
      setError(error.response?.data?.message || error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (value) => {
    setEditedContent(value);
    logger.debug('模板內容已更新', { 
      deploymentName,
      contentLength: value?.length 
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        logger.info('關閉模板編輯器');
        onClose();
      }}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { 
          height: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      aria-labelledby="yaml-editor-title"
    >
      <DialogTitle id="yaml-editor-title">
        {t('podDeployment:podDeployment.yamlTemplate.editor')}
      </DialogTitle>
      <DialogContent 
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          p: 0
        }}
      >
        <FormControl 
          fullWidth 
          sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <FormLabel 
            id="yaml-editor-label"
            sx={{ px: 3, py: 1 }}
          >
            {t('podDeployment:podDeployment.yamlTemplate.content')}
          </FormLabel>
          <Box sx={{ 
            flex: 1,
            minHeight: 0,
            px: 3
          }}>
            <CustomMonacoEditor
              value={editedContent}
              onChange={handleEditorChange}
              aria-labelledby="yaml-editor-label"
            />
          </Box>
        </FormControl>
        {(error || localError) && (
          <Alert severity="error" sx={{ m: 3 }}>
            {error || localError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>
          {t('podDeployment:podDeployment.yamlTemplate.close')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving && <CircularProgress size={20} />}
        >
          {t('podDeployment:podDeployment.yamlTemplate.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default YamlEditor; 