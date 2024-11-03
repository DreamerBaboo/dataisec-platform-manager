import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Typography,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';   
import {
  TEMPLATE_CATEGORIES,
  getTemplateCategories,
  getTemplatesByCategory,
  saveTemplate,
  deleteTemplate
} from '../../../utils/templateCategories';

const TemplateManager = ({ open, onClose, onLoad, currentConfig }) => {
  const { t } = useAppTranslation();
  const [templates, setTemplates] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(TEMPLATE_CATEGORIES.APPLICATION);
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  const categories = getTemplateCategories();

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  const loadTemplates = () => {
    try {
      const categoryTemplates = getTemplatesByCategory(selectedCategory);
      setTemplates(categoryTemplates);
    } catch (err) {
      setError(t('podDeployment:podDeployment.templates.loadError'));
    }
  };

  const handleSaveTemplate = () => {
    if (!templateName) {
      setError(t('podDeployment:podDeployment.templates.nameRequired'));
      return;
    }

    try {
      const newTemplate = {
        name: templateName,
        description,
        category: selectedCategory,
        config: currentConfig,
        createdAt: new Date().toISOString()
      };

      saveTemplate(newTemplate);
      loadTemplates();
      setTemplateName('');
      setDescription('');
      setError(null);
    } catch (err) {
      setError(t('podDeployment:podDeployment.templates.saveError'));
    }
  };

  const handleDeleteTemplate = (templateName) => {
    try {
      deleteTemplate(templateName);
      loadTemplates();
    } catch (err) {
      setError(t('podDeployment:podDeployment.templates.deleteError'));
    }
  };

  const handleLoadTemplate = (template) => {
    onLoad?.(template.config);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('podDeployment:podDeployment.templates.title')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label={t('podDeployment:podDeployment.templates.save')} />
          <Tab label={t('podDeployment:podDeployment.templates.browse')} />
        </Tabs>

        {currentTab === 0 ? (
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.templates.name')}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.templates.description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('podDeployment:podDeployment.templates.category')}</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {t(`podDeployment:podDeployment.templates.categories.${category.name}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveTemplate}
              fullWidth
            >
              {t('podDeployment:podDeployment.templates.saveButton')}
            </Button>
          </Box>
        ) : (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('podDeployment:podDeployment.templates.filterByCategory')}</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {t(`podDeployment:podDeployment.templates.categories.${category.name}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <List>
              {templates.map((template, index) => (
                <ListItem
                  key={index}
                  button
                  onClick={() => handleLoadTemplate(template)}
                >
                  <ListItemText
                    primary={template.name}
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {template.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(template.createdAt).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.name);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TemplateManager; 