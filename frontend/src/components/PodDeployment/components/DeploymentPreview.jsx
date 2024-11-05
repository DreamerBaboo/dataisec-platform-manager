import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Alert,
  Button
} from '@mui/material';
import Editor from '@monaco-editor/react';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { useSnackbar } from 'notistack';
import yaml from 'js-yaml'; // Add yaml parser

// Add placeholder categories
const PLACEHOLDER_CATEGORIES = {
  image: ['repository', 'repository_port', 'tag'],
  service: ['service_port', 'target_service_port', 'node_port', 'web_port'],
  resources: ['cpu_limit', 'memory_limit', 'cpu_request', 'memory_request'],
  deployment: ['replica_count'],
  node: ['node_selector', 'site_node'],
  misc: ['company_name']
};

const DeploymentPreview = ({ config, onDeploy, onBack }) => {
  const { t } = useAppTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [showYaml, setShowYaml] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const getPlaceholderCategory = (placeholder) => {
    for (const [category, items] of Object.entries(PLACEHOLDER_CATEGORIES)) {
      if (items.some(item => placeholder.toLowerCase().includes(item))) {
        return category;
      }
    }
    return 'misc';
  };

  const generateYamlPreview = () => {
    if (!config.yamlTemplate?.content) return '';

    let preview = config.yamlTemplate.content;
    Object.entries(config.yamlTemplate.placeholders).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'gi');
      preview = preview.replace(regex, value || '');
    });
    return preview;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const yamlContent = generateYamlPreview();
      
      // Validate YAML format
      try {
        yaml.load(yamlContent);
      } catch (yamlError) {
        throw new Error(`Invalid YAML format: ${yamlError.message}`);
      }

      const fileName = `${config.name}-${config.version}-final.yaml`;

      const response = await fetch(`/api/deployment-templates/${config.name}/save-final`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: yamlContent,
          fileName: fileName
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }

      enqueueSnackbar(t('podDeployment:podDeployment.preview.saveSuccess'), {
        variant: 'success'
      });

    } catch (error) {
      console.error('Failed to save configuration:', error);
      setSaveError(error.message);
      enqueueSnackbar(t('podDeployment:podDeployment.preview.saveError'), {
        variant: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderPlaceholdersByCategory = () => {
    const categorizedPlaceholders = {};
    
    Object.entries(config.yamlTemplate?.placeholders || {}).forEach(([key, value]) => {
      const category = getPlaceholderCategory(key);
      if (!categorizedPlaceholders[category]) {
        categorizedPlaceholders[category] = [];
      }
      categorizedPlaceholders[category].push({ key, value });
    });

    return (
      <Grid container spacing={3}>
        {Object.entries(categorizedPlaceholders).map(([category, placeholders]) => (
          <Grid item xs={12} md={6} key={category}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {t(`podDeployment:podDeployment.preview.categories.${category}`)}
              </Typography>
              {placeholders.map(({ key, value }) => (
                <Box key={key} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">{key}</Typography>
                  <Typography>{value || '-'}</Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.preview.title')}
      </Typography>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      {renderPlaceholdersByCategory()}

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => setShowYaml(!showYaml)}
        >
          {showYaml ? t('podDeployment:podDeployment.preview.hideYaml') : t('podDeployment:podDeployment.preview.showYaml')}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? t('common:common.saving') : t('common:common.save')}
        </Button>
      </Box>

      {showYaml && (
        <Box sx={{ mt: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                size="small"
                onClick={() => setShowYaml(false)}
              >
                {t('common:common.close')}
              </Button>
            </Box>
            <Editor
              height="400px"
              defaultLanguage="yaml"
              value={generateYamlPreview()}
              options={{ readOnly: true }}
            />
          </Paper>
        </Box>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack}>
          {t('common:common.back')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => onDeploy(config)}
        >
          {t('common:common.deploy')}
        </Button>
      </Box>
    </Box>
  );
};

export default DeploymentPreview;