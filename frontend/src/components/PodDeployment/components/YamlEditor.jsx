import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert
} from '@mui/material';
import Editor from '@monaco-editor/react';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const YamlEditor = ({ open, onClose, content, deploymentName, templateFile, onSave, error }) => {
  const { t } = useAppTranslation();
  const [editedContent, setEditedContent] = useState(content);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      console.log('Saving template:', {
        deploymentName,
        templateFile,
        contentLength: editedContent.length
      });

      // Save changes to the template file
      const response = await fetch(`/api/deployment-templates/${deploymentName}/template`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: editedContent
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save template');
      }

      // Call the onSave callback with the new content
      await onSave(editedContent);
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle>
        {t('podDeployment:podDeployment.yamlTemplate.editor')} - {templateFile}
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflow: 'hidden' }}>
        {(error || saveError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || saveError}
          </Alert>
        )}

        <Editor
          height="100%"
          defaultLanguage="yaml"
          value={editedContent}
          onChange={setEditedContent}
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            theme: 'vs-light'
          }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {t('common:common.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving 
            ? t('common:common.saving')
            : t('common:common.save')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default YamlEditor; 