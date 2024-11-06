import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Alert,
  Paper,
  TextField,
  InputAdornment,
  Autocomplete
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import YamlEditor from '../components/YamlEditor';

const PLACEHOLDER_CATEGORIES = {
  image: ['repository', 'repository_port', 'tag'],
  service: ['service_port', 'target_service_port', 'node_port', 'web_port'],
  deployment: ['replica_count'],
  misc: ['company_name']
};

const TemplateConfig = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();
  const [editorOpen, setEditorOpen] = useState(false);
  const [placeholderFilter, setPlaceholderFilter] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateFile, setTemplateFile] = useState('');
  const [yamlError, setYamlError] = useState(null);

  useEffect(() => {
    loadTemplate();
  }, [config.templatePath]);

  const loadTemplate = async () => {
    try {
      if (!config.name) {
        throw new Error('Deployment name is required');
      }

      // First, get the list of files in the deployment directory
      const response = await fetch(`/api/deployment-templates/${config.name}/files`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get template files');
      }

      const files = await response.json();
      console.log('Found template files:', files);

      // The backend now returns array with single template file
      const templateFile = files[0];
      if (!templateFile) {
        throw new Error('No template file found');
      }

      // Store the template file name
      setTemplateFile(templateFile);

      // Load the template file content
      const templateResponse = await fetch(`/api/deployment-templates/${config.name}/file/${templateFile}`);
      if (!templateResponse.ok) {
        throw new Error('Failed to load template file');
      }

      const content = await templateResponse.text();
      console.log('Loaded template:', {
        file: templateFile,
        contentLength: content.length
      });
      setTemplateContent(content);
      parseTemplate(content);
    } catch (error) {
      console.error('Template loading error:', error);
      setYamlError(error.message);
    }
  };

  const parseTemplate = (content) => {
    try {
      const placeholders = {};
      const defaultValues = {};
      
      content.split('\n').forEach(line => {
        // Match different placeholder patterns:
        // 1. ${PLACEHOLDER} #[value1, value2]          - Multiple comma-separated values
        // 2. ${PLACEHOLDER} #[single_value]            - Single value
        // 3. ${PLACEHOLDER} #[alphanumeric-string]     - Alphanumeric with dashes
        // 4. ${PLACEHOLDER} #[any_text_without_braces] - Any text without [] brackets
        const matches = line.match(/\${([^}]+)}.*?#\[(.*?)\]/);
        if (matches) {
          const placeholder = matches[1].toLowerCase();
          // Allow any text that doesn't contain brackets as default values
          const values = matches[2].split(',').map(v => v.trim());
          placeholders[placeholder] = config.yamlTemplate?.placeholders?.[placeholder] || '';
          defaultValues[placeholder] = values;
        }

        // Match composite placeholders with multiple default values
        // ${PLACEHOLDER1}:${PLACEHOLDER2} #[val1] #[val2]
        const compositeMatches = line.match(/\${([^}]+)}:\${([^}]+)}.*?#\[(.*?)\].*?#\[(.*?)\]/);
        if (compositeMatches) {
          const [ph1, ph2] = [compositeMatches[1], compositeMatches[2]].map(p => p.toLowerCase());
          const [vals1, vals2] = [compositeMatches[3], compositeMatches[4]].map(v => 
            v.split(',').map(val => val.trim())
          );
          placeholders[ph1] = config.yamlTemplate?.placeholders?.[ph1] || '';
          placeholders[ph2] = config.yamlTemplate?.placeholders?.[ph2] || '';
          defaultValues[ph1] = vals1;
          defaultValues[ph2] = vals2;
        }
      });

      onChange({
        ...config,
        yamlTemplate: {
          content,
          placeholders,
          defaultValues,
          originalContent: content
        }
      });
    } catch (error) {
      setYamlError('Failed to parse template');
    }
  };

  const handlePlaceholderChange = (placeholder, value) => {
    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        placeholders: {
          ...config.yamlTemplate.placeholders,
          [placeholder]: value
        }
      }
    });
  };

  const getPlaceholderCategory = (placeholder) => {
    if (placeholder.includes('cpu_') || 
        placeholder.includes('memory_') || 
        placeholder.includes('node_selector') || 
        placeholder.includes('site_node') ||
        placeholder.includes('limit') ||
        placeholder.includes('request')) {
      return null;
    }

    for (const [category, items] of Object.entries(PLACEHOLDER_CATEGORIES)) {
      if (items.some(item => placeholder.includes(item))) {
        return category;
      }
    }
    return 'misc';
  };

  const renderPlaceholderField = (placeholder) => {
    const hasDefaultValues = config.yamlTemplate?.defaultValues?.[placeholder];

    if (hasDefaultValues) {
      return (
        <Autocomplete
          freeSolo
          value={config.yamlTemplate.placeholders[placeholder] || ''}
          onChange={(_, newValue) => handlePlaceholderChange(placeholder, newValue)}
          options={config.yamlTemplate.defaultValues[placeholder]}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              label={placeholder}
              variant="outlined"
            />
          )}
        />
      );
    }

    return (
      <TextField
        fullWidth
        label={placeholder}
        value={config.yamlTemplate.placeholders[placeholder] || ''}
        onChange={(e) => handlePlaceholderChange(placeholder, e.target.value)}
      />
    );
  };

  const generatePreview = () => {
    if (!config.yamlTemplate?.content) return '';

    let preview = config.yamlTemplate.content;
    Object.entries(config.yamlTemplate.placeholders).forEach(([key, value]) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'gi');
      preview = preview.replace(regex, value || '');
    });
    return preview;
  };

  const renderPlaceholders = () => (
    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
      {Object.entries(PLACEHOLDER_CATEGORIES).map(([category, _]) => {
        const categoryPlaceholders = Object.keys(config.yamlTemplate?.placeholders || {})
          .filter(key => {
            const matchesFilter = key.toLowerCase().includes(placeholderFilter.toLowerCase());
            const placeholderCategory = getPlaceholderCategory(key);
            // Only show placeholders that belong to this category and aren't handled by other steps
            return matchesFilter && placeholderCategory === category;
          });

        if (categoryPlaceholders.length === 0) return null;

        return (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, textTransform: 'capitalize' }}>
              {category}
            </Typography>
            <Grid container spacing={2}>
              {categoryPlaceholders.map((placeholder) => (
                <Grid item xs={12} key={placeholder}>
                  {renderPlaceholderField(placeholder)}
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      })}
    </Box>
  );

  const handleTemplateChange = async (templateData) => {
    try {
      const { content, placeholders, defaultValues, categories } = templateData;

      // Update configuration with new placeholders and categories
      onChange({
        ...config,
        yamlTemplate: {
          ...config.yamlTemplate,
          content,
          placeholders: {
            ...config.yamlTemplate?.placeholders,
            ...Object.keys(placeholders).reduce((acc, key) => ({
              ...acc,
              [key]: placeholders[key] || config.yamlTemplate?.placeholders?.[key] || ''
            }), {})
          },
          defaultValues: {
            ...config.yamlTemplate?.defaultValues,
            ...defaultValues
          },
          categories
        }
      });

      // Refresh template content
      setTemplateContent(content);
    } catch (error) {
      console.error('Template refresh error:', error);
      setYamlError(error.message);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          {t('podDeployment:podDeployment.yamlTemplate.editor')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadTemplate}
          >
            {t('podDeployment:podDeployment.yamlTemplate.reload')}
          </Button>
          <Button
            startIcon={<EditIcon />}
            onClick={() => setEditorOpen(true)}
          >
            {t('podDeployment:podDeployment.yamlTemplate.editTemplate')}
          </Button>
        </Box>
      </Box>

      {yamlError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {yamlError}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('podDeployment:podDeployment.yamlTemplate.searchPlaceholders')}
              value={placeholderFilter}
              onChange={(e) => setPlaceholderFilter(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Box>

          <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflow: 'auto' }}>
            {renderPlaceholders()}
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ height: 'calc(100vh - 300px)' }}>
            <Editor
              height="100%"
              defaultLanguage="yaml"
              value={generatePreview()}
              options={{
                readOnly: true,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                theme: 'vs-light'
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      <YamlEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        content={templateContent}
        deploymentName={config.name}
        templateFile={templateFile}
        onSave={async (newContent) => {
          try {
            setTemplateContent(newContent);
            parseTemplate(newContent);
            setEditorOpen(false);
          } catch (error) {
            setYamlError('Failed to save template');
          }
        }}
        error={yamlError}
        onTemplateChange={handleTemplateChange}
      />
    </Box>
  );
};

export default TemplateConfig; 