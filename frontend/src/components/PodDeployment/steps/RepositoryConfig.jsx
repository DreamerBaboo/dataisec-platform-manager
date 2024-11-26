import React, { useState, useEffect } from 'react';
import { logger } from '../../../utils/logger.ts';
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

  const fetchRepositories = async () => {
    try {
      setLoading(true);
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
      if (Array.isArray(response.data)) {
        const filteredRepos = Array.from(new Set(response.data
          .filter(repo => repo && repo.name && !repo.name.includes('sha256:'))
          .map(repo => repo.name)))
          .sort((a, b) => a.localeCompare(b));
        setRepositories(filteredRepos);
      }
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      if (error.response?.status === 401) {
        console.error('Unauthorized: Token may be invalid or expired');
        localStorage.removeItem('token');
      }
    } finally {
      setLoading(false);
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

  const saveRepositoryconfig = async (field, value) => {
    try {
      // Create a new config object with updated values
      const updatedConfig = {
        ...config,
        [field]: value, // Update the top-level field
        yamlTemplate: {
          ...config.yamlTemplate,
          placeholders: {
            ...config.yamlTemplate?.placeholders,
            [field]: value // Update the placeholder
          }
        }
      };

      // Update parent state
      onChange(updatedConfig);

      // Save to config.json
      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        updatedConfig
      );

      logger.info(`✅ Repository field ${field} saved to config.json:`, value);
    } catch (error) {
      console.error(`❌ Failed to save repository field ${field}:`, error);
      setLocalErrors(prev => ({
        ...prev,
        [field]: 'Failed to save value'
      }));
    }
  };
 

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <FormControl fullWidth error={!!errors?.repository}>
                  <InputLabel>{t('podDeployment:podDeployment.repository.selectRepository')}</InputLabel>
                  <Select
                    value={config.repository || ''}
                    onChange={(event) => saveRepositoryconfig('repository', event.target.value)}
                    label={t('podDeployment:podDeployment.repository.selectRepository')}
                  >
                    {repositories.map((repo, index) => (
                      <MenuItem key={`${repo}-${index}`} value={repo}>
                        {repo}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors?.repository && (
                    <Typography color="error" variant="caption">
                      {errors.repository}
                    </Typography>
                  )}
                </FormControl>

                {config.repository && (
                  <FormControl fullWidth sx={{ mt: 2 }} error={!!errors?.tag}>
                    <InputLabel>{t('podDeployment:podDeployment.repository.selectTag')}</InputLabel>
                    <Select
                      value={config.tag || ''}
                      onChange={(event) => saveRepositoryconfig('tag', event.target.value)}
                      label={t('podDeployment:podDeployment.repository.selectTag')}
                    >
                      {tags.map((tag, index) => (
                        <MenuItem key={`${tag}-${index}`} value={tag}>
                          {tag}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors?.tag && (
                      <Typography color="error" variant="caption">
                        {errors.tag}
                      </Typography>
                    )}
                  </FormControl>
                )}

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RepositoryConfig;