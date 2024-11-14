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
  Autocomplete,
  Divider,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import Editor from '@monaco-editor/react';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import YamlEditor from '../components/YamlEditor';
import podDeploymentService from '../../../services/podDeploymentService';
import SearchBar from '../../common/SearchBar';

const PLACEHOLDER_CATEGORIES = {
  image: ['repository', 'tag'],
  service: ['service_port', 'target_service_port', 'node_port', 'web_port'],
  deployment: ['replica_count'],
  resource: ['cpu_', 'memory_', 'java_heap'],
  storage: ['storage_class', 'storage_access_mode', 'persistence_size'],
  misc: ['company_name']
};

const TemplateConfig = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();
  const [editorOpen, setEditorOpen] = useState(false);
  const [placeholderFilter, setPlaceholderFilter] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateFile, setTemplateFile] = useState('');
  const [yamlError, setYamlError] = useState(null);
  const [namespaces, setNamespaces] = useState([]);
  const [isLoadingNamespaces, setIsLoadingNamespaces] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [createNamespaceDialog, setCreateNamespaceDialog] = useState(false);
  const [newNamespace, setNewNamespace] = useState('');

  useEffect(() => {
    loadTemplate();
  }, [config.templatePath]);

  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        setIsLoadingNamespaces(true);
        const response = await podDeploymentService.getNamespaces();
        const namespaceNames = response.map(ns => ns.name);
        setNamespaces(namespaceNames);
      } catch (error) {
        console.error('Failed to fetch namespaces:', error);
      } finally {
        setIsLoadingNamespaces(false);
      }
    };

    fetchNamespaces();
  }, []);

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

  const handlePlaceholderChange = async (placeholder, value) => {
    try {
      if (placeholder === 'namespace') return;

      const updatedConfig = {
        ...config,
        yamlTemplate: {
          ...config.yamlTemplate,
          placeholders: {
            ...config.yamlTemplate?.placeholders,
            [placeholder]: value
          }
        }
      };

      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        updatedConfig
      );

      onChange(updatedConfig);

      console.log(`✅ Placeholder ${placeholder} updated successfully:`, value);
    } catch (error) {
      console.error(`❌ Failed to update placeholder ${placeholder}:`, error);
      setYamlError(`Failed to save placeholder configuration`);
    }
  };

  const getPlaceholderCategory = (placeholder) => {
    if (placeholder === 'namespace' || 
        placeholder === 'storage_class' ||
        placeholder === 'storage_access_mode' ||
        placeholder === 'persistence_size') {
      return null;
    }

    if (placeholder.includes('cpu_') || 
        placeholder.includes('memory_') || 
        placeholder.includes('node_selector') || 
        placeholder.includes('site_node') ||
        placeholder.includes('limit') ||
        placeholder.includes('request')) {
      return 'resource';
    }

    for (const [category, items] of Object.entries(PLACEHOLDER_CATEGORIES)) {
      if (items.some(item => placeholder.includes(item))) {
        return category;
      }
    }
    return 'misc';
  };

  const renderPlaceholderField = (placeholder) => {
    if (placeholder === 'namespace') return null;

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

  const handleTemplateChange = async (templateData) => {
    try {
      const { content, placeholders, defaultValues, categories } = templateData;

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

      setTemplateContent(content);
    } catch (error) {
      console.error('Template refresh error:', error);
      setYamlError(error.message);
    }
  };

  const handleNamespaceChange = async (event, newValue) => {
    try {
      if (!newValue) return;

      const namespaceValue = typeof newValue === 'string' ? newValue : newValue.name;
      console.log('Namespace change:', { namespaceValue, newValue });

      const isNewNamespace = !namespaces.includes(namespaceValue);
      
      if (isNewNamespace) {
        setNewNamespace(namespaceValue);
        setCreateNamespaceDialog(true);
      } else {
        const updatedConfig = {
          ...config,
          namespace: namespaceValue,
          yamlTemplate: {
            ...config.yamlTemplate,
            placeholders: {
              ...config.yamlTemplate?.placeholders,
              namespace: namespaceValue
            }
          }
        };

        // 保存到配置文件
        await podDeploymentService.saveDeploymentConfig(
          config.name,
          config.version,
          updatedConfig
        );

        // 保存到 YAML 模板
        await podDeploymentService.saveStorageConfig(
          config.name,
          config.version,
          {
            placeholders: updatedConfig.yamlTemplate.placeholders
          }
        );

        console.log('✅ Namespace saved successfully:', {
          namespace: namespaceValue,
          config: updatedConfig
        });

        onChange(updatedConfig);
      }
    } catch (error) {
      console.error('Failed to handle namespace change:', error);
      setYamlError('Failed to update namespace configuration');
    }
  };

  const handleCreateNamespace = async () => {
    try {
      const response = await podDeploymentService.createNamespace(newNamespace);
      
      if (response.success) {
        const updatedNamespaces = await podDeploymentService.getNamespaces();
        const namespaceNames = updatedNamespaces.map(ns => ns.name);
        setNamespaces(namespaceNames);
        
        const updatedConfig = {
          ...config,
          namespace: newNamespace,
          yamlTemplate: {
            ...config.yamlTemplate,
            placeholders: {
              ...config.yamlTemplate?.placeholders,
              namespace: newNamespace
            }
          }
        };

        await podDeploymentService.saveDeploymentConfig(
          config.name,
          config.version,
          updatedConfig
        );

        onChange(updatedConfig);
        setCreateNamespaceDialog(false);
      }
    } catch (error) {
      console.error('Failed to create namespace:', error);
      setYamlError('Failed to create namespace');
    }
  };

  const handleNamespaceBlur = async (event) => {
    const namespaceValue = event.target.value?.trim();
    
    if (!namespaceValue) return;

    console.log('Namespace blur detected:', {
      value: namespaceValue,
      existingNamespaces: namespaces,
      isNew: !namespaces.includes(namespaceValue)
    });

    const isNewNamespace = !namespaces.includes(namespaceValue);
    
    if (isNewNamespace) {
      setNewNamespace(namespaceValue);
      setCreateNamespaceDialog(true);
    }
  };

  const handleTemplateFieldChange = async (field, value) => {
    try {
      const updatedConfig = {
        ...config,
        [field]: value
      };

      onChange(updatedConfig);

      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        updatedConfig
      );

      console.log(`✅ Template field ${field} updated successfully:`, value);
    } catch (error) {
      console.error(`❌ Failed to update template field ${field}:`, error);
      setYamlError(`Failed to save ${field} configuration`);
    }
  };

  const handleTemplateContentSave = async (newContent) => {
    try {
      const updatedConfig = {
        ...config,
        yamlTemplate: {
          ...config.yamlTemplate,
          content: newContent
        }
      };

      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        updatedConfig
      );

      onChange(updatedConfig);
      setTemplateContent(newContent);
      setEditorOpen(false);

      console.log('✅ Template content saved successfully');
    } catch (error) {
      console.error('❌ Failed to save template content:', error);
      setYamlError('Failed to save template content');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('podDeployment:podDeployment.templateConfig.title')}
        </Typography>
        
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="textSecondary">
            {t('podDeployment:podDeployment.templateConfig.namespaceSection')}
          </Typography>
          <Autocomplete
            freeSolo
            value={config.namespace || ''}
            onChange={handleNamespaceChange}
            onInputChange={(event, newValue) => {
              if (event) {
                const updatedConfig = {
                  ...config,
                  namespace: newValue,
                  yamlTemplate: {
                    ...config.yamlTemplate,
                    placeholders: {
                      ...config.yamlTemplate?.placeholders,
                      namespace: newValue
                    }
                  }
                };
                onChange(updatedConfig);
              }
            }}
            options={namespaces}
            loading={isLoadingNamespaces}
            getOptionLabel={(option) => {
              return typeof option === 'string' ? option : option.name || '';
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('podDeployment:podDeployment.basic.namespace')}
                required
                error={!!errors?.namespace}
                helperText={errors?.namespace}
                onBlur={handleNamespaceBlur}
              />
            )}
          />
        </Paper>
      </Box>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadTemplate}
          >
            {t('podDeployment:podDeployment.yamlTemplate.reload')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditorOpen(true)}
          >
            {t('podDeployment:podDeployment.yamlTemplate.editTemplate')}
          </Button>
        </Box>
        <Button
          variant="contained"
          startIcon={showPreview ? <VisibilityOffIcon /> : <VisibilityIcon />}
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview 
            ? t('podDeployment:podDeployment.yamlTemplate.hidePreview')
            : t('podDeployment:podDeployment.yamlTemplate.showPreview')
          }
        </Button>
      </Box>

      {yamlError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {yamlError}
        </Alert>
      )}

      <Collapse in={showPreview} sx={{ mb: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PreviewIcon />
            {t('podDeployment:podDeployment.yamlTemplate.preview')}
          </Typography>
          <Box sx={{ height: '400px' }}>
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
          </Box>
        </Paper>
      </Collapse>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('podDeployment:podDeployment.yamlTemplate.placeholders')}
        </Typography>
        
        <SearchBar
          value={placeholderFilter}
          onChange={(e) => setPlaceholderFilter(e.target.value)}
          onClear={() => setPlaceholderFilter('')}
          placeholder={t('podDeployment:podDeployment.yamlTemplate.searchPlaceholders')}
          sx={{ mb: 2 }}
        />

        <Grid container spacing={2}>
          {Object.entries(PLACEHOLDER_CATEGORIES).map(([category, _]) => {
            const categoryPlaceholders = Object.keys(config.yamlTemplate?.placeholders || {})
              .filter(key => {
                const matchesFilter = key.toLowerCase().includes(placeholderFilter.toLowerCase());
                const placeholderCategory = getPlaceholderCategory(key);
                return matchesFilter && 
                       placeholderCategory === category && 
                       key !== 'namespace' && 
                       key !== 'repository' && 
                       key !== 'tag' &&
                       key !== 'storage_class' &&
                       key !== 'storage_access_mode' &&
                       key !== 'persistence_size';
              });

            if (categoryPlaceholders.length === 0) return null;

            return (
              <Grid item xs={12} md={6} key={category}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 1.5,
                    '& .MuiGrid-container': {
                      rowGap: 1
                    }
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      mb: 1.5,
                      textTransform: 'capitalize',
                      px: 0.5
                    }}
                  >
                    {t(`podDeployment:podDeployment.yamlTemplate.categories.${category}`)}
                  </Typography>
                  <Grid container spacing={1}>
                    {categoryPlaceholders.map((placeholder) => (
                      <Grid item xs={12} key={placeholder}>
                        {renderPlaceholderField(placeholder)}
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <YamlEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        content={templateContent}
        deploymentName={config.name}
        templateFile={templateFile}
        onSave={handleTemplateContentSave}
        error={yamlError}
        onTemplateChange={handleTemplateChange}
      />

      <Dialog
        open={createNamespaceDialog}
        onClose={() => setCreateNamespaceDialog(false)}
      >
        <DialogTitle>
          {t('podDeployment:podDeployment.namespace.createTitle')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('podDeployment:podDeployment.namespace.createConfirm', {
              namespace: newNamespace
            })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateNamespaceDialog(false);
            onChange({
              ...config,
              namespace: ''
            });
          }}>
            {t('common:common.cancel')}
          </Button>
          <Button 
            onClick={handleCreateNamespace} 
            variant="contained"
            color="primary"
          >
            {t('common:common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateConfig; 