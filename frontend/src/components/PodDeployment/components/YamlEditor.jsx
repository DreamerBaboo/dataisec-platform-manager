import React, { useState, useEffect } from 'react';
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

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Save template content
      await templateService.saveTemplateContent(
        deploymentName,
        editedContent
      );

      // Call onSave callback with the edited content
      await onSave(editedContent);
      
      // Analyze template for new placeholders
      const { placeholders, defaultValues, categories } = 
        await templateService.getTemplatePlaceholders(deploymentName);

      // Trigger template refresh in parent component
      if (onTemplateChange) {
        await onTemplateChange({
          content: editedContent,
          placeholders,
          defaultValues,
          categories
        });
      }
      
      onClose();
    } catch (err) {
      console.error('Failed to save template:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (value) => {
    setEditedContent(value);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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