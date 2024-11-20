import React, { useState, useEffect } from 'react';
import { logger } from '../../../utils/logger'; // 導入 logger
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Autocomplete,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import axios from 'axios';
import { podDeploymentService } from '../../../services/podDeploymentService';

const RepositoryConfig = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();
  const [repositories, setRepositories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRepositories = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await axios.get('/api/docker/repositories', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      logger.info('Repositories response:', response.data);
      setRepositories(response.data);
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      if (error.response?.status === 401) {
        console.error('Unauthorized: Token may be invalid or expired');
        localStorage.removeItem('token');
      }
    }
  }; 

  const fetchTags = async (repository) => {
    if (!repository) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        setError(t('podDeployment:podDeployment.repository.errors.unauthorized'));
        return;
      }

      const response = await axios.get(`/api/docker/tags/${encodeURIComponent(repository)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setTags(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      if (err.response?.status === 401) {
        setError(t('podDeployment:podDeployment.repository.errors.unauthorized'));
      } else {
        setError(t('podDeployment:podDeployment.repository.errors.tagsFetchFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  useEffect(() => {
    if (config.repository) {
      fetchTags(config.repository);
    }
  }, [config.repository]);

  const handleRepositoryChange = async (event, newValue) => {
    try {
      const updatedConfig = {
        ...config,
        repository: newValue,
        tag: '',
        yamlTemplate: {
          ...config.yamlTemplate,
          placeholders: {
            ...config.yamlTemplate?.placeholders,
            repository: newValue,
            tag: ''
          }
        }
      };

      onChange(updatedConfig);

      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        updatedConfig
      );

      await podDeploymentService.saveStorageConfig(
        config.name,
        config.version,
        {
          placeholders: updatedConfig.yamlTemplate.placeholders
        }
      );

      logger.info('✅ Repository saved successfully:', {
        repository: newValue,
        configJson: true,
        yaml: true
      });

      setError(null);
    } catch (error) {
      console.error('Failed to save repository:', error);
      setError(t('podDeployment:podDeployment.repository.errors.saveFailed'));
    }
  };

  const handleTagChange = async (event) => {
    try {
      const newTag = event.target.value;

      const updatedConfig = {
        ...config,
        tag: newTag,
        yamlTemplate: {
          ...config.yamlTemplate,
          placeholders: {
            ...config.yamlTemplate?.placeholders,
            tag: newTag
          }
        }
      };

      onChange(updatedConfig);

      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        updatedConfig
      );

      await podDeploymentService.saveStorageConfig(
        config.name,
        config.version,
        {
          placeholders: updatedConfig.yamlTemplate.placeholders
        }
      );

      logger.info('✅ Tag saved successfully:', {
        tag: newTag,
        configJson: true,
        yaml: true
      });

      setError(null);
    } catch (error) {
      console.error('Failed to save tag:', error);
      setError(t('podDeployment:podDeployment.repository.errors.saveFailed'));
    }
  };

  const handleSearchChange = (event) => {
    const term = event.target.value;
    setSearchTerm(term);
    if (term) {
      searchImages(term);
    } else {
      fetchRepositories();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.repository.title')}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('podDeployment:podDeployment.repository.search')}
              value={searchTerm}
              onChange={handleSearchChange}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              fullWidth
              options={repositories}
              value={config.yamlTemplate?.placeholders?.repository || null}
              onChange={handleRepositoryChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('podDeployment:podDeployment.repository.repository')}
                  error={!!errors?.repository}
                  helperText={errors?.repository}
                />
              )}
              loading={loading}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>{t('podDeployment:podDeployment.repository.tag')}</InputLabel>
              <Select
                value={config.yamlTemplate?.placeholders?.tag || ''}
                onChange={handleTagChange}
                label={t('podDeployment:podDeployment.repository.tag')}
                error={!!errors?.tag}
                disabled={!config.yamlTemplate?.placeholders?.repository}
              >
                {tags.map((tag) => (
                  <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default RepositoryConfig; 