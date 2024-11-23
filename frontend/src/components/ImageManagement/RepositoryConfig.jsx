import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { logger } from '../../utils/logger.ts';
import { api } from '../../utils/api';

const RepositoryConfig = ({ open, onClose }) => {
  const { t } = useAppTranslation();
  const [repository, setRepository] = useState(localStorage.getItem('repositoryHost') || '');
  const [port, setPort] = useState(localStorage.getItem('repositoryPort') || '5000');
  const [repositories, setRepositories] = useState([]);
  const [selectedRepository, setSelectedRepository] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      fetchRepositories();
    }
  }, [open]);

  const fetchRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('api/images/repositories');
      logger.info('📦 Fetched repositories:', response);
      
      if (Array.isArray(response)) {
        // Filter out sha256 and process repository names
        const filteredRepos = response
          .filter(repo => {
            // Skip non-string values and sha256 hashes
            if (typeof repo !== 'string') return false;
            return !repo.includes('sha256:');
          })
          .filter((name, index, self) => self.indexOf(name) === index) // Remove duplicates
          .slice(0, 100); // Limit to maximum 100 items for performance
        
        setRepositories(filteredRepos);
        logger.info(`Filtered repositories from ${response.length} to ${filteredRepos.length} items`);
      } else {
        throw new Error('Invalid repository list format');
      }
    } catch (error) {
      logger.error('❌ Error fetching repositories:', error);
      setError(error.message || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async (repo) => {
    if (!repo) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`api/images/tags/${encodeURIComponent(repo)}`);
      logger.info('🏷️ Fetched tags:', response);
      
      if (Array.isArray(response)) {
        setTags(response);
      } else {
        throw new Error('Invalid tag list format');
      }
    } catch (error) {
      logger.error('❌ Error fetching tags:', error);
      setError(error.message || 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  };

  const handleRepositoryChange = (event) => {
    const repo = event.target.value;
    setSelectedRepository(repo);
    setSelectedTag('');
    fetchTags(repo);
  };

  const handleTagChange = (event) => {
    setSelectedTag(event.target.value);
  };

  const handleSave = () => {
    localStorage.setItem('repositoryHost', repository);
    localStorage.setItem('repositoryPort', port);
    onClose({ repository, port, selectedRepository, selectedTag });
  };

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{t('images:imageManagement.registry.title')}</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              minHeight: '200px' // Ensure minimum height for centering
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('images:imageManagement.registry.repository.label')}
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              fullWidth
              placeholder={t('images:imageManagement.registry.repository.placeholder')}
            />
            <TextField
              label={t('images:imageManagement.registry.port.label')}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              fullWidth
              placeholder={t('images:imageManagement.registry.port.placeholder')}
            />
            
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <FormControl fullWidth disabled={loading}>
              <InputLabel>{t('images:imageManagement.registry.selectRepository')}</InputLabel>
              <Select
                value={selectedRepository}
                onChange={handleRepositoryChange}
                label={t('images:imageManagement.registry.selectRepository')}
              >
                {repositories.map((name, index) => (
                  <MenuItem key={`${name}-${index}`} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedRepository && (
              <FormControl fullWidth disabled={loading}>
                <InputLabel>{t('images:imageManagement.registry.selectTag')}</InputLabel>
                <Select
                  value={selectedTag}
                  onChange={handleTagChange}
                  label={t('images:imageManagement.registry.selectTag')}
                >
                  {tags.map((tag) => (
                    <MenuItem key={tag} value={tag}>
                      {tag}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(null)}>{t('images:imageManagement.actions.cancel')}</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={loading}
        >
          {t('images:imageManagement.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RepositoryConfig;