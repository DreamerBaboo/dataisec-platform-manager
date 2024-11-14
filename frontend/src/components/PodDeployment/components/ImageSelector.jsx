import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Box,
  CircularProgress,
  Typography,
  Alert
} from '@mui/material';
import axios from 'axios';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const ImageSelector = ({ value, onChange }) => {
  const { t } = useAppTranslation();
  const [repositories, setRepositories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 獲取倉庫列表
  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/images/repositories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRepositories(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 獲取標籤列表
  const fetchTags = async (repository) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/images/tags?repository=${repository}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setTags(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  useEffect(() => {
    if (value.repository) {
      fetchTags(value.repository);
    }
  }, [value.repository]);

  const handleRepositoryChange = (event) => {
    const newRepository = event.target.value;
    onChange({
      repository: newRepository,
      tag: ''  // 清空標籤
    });
  };

  const handleTagChange = (event) => {
    onChange({
      ...value,
      tag: event.target.value
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>{t('podDeployment:podDeployment.form.imageRepository')}</InputLabel>
          <Select
            value={value.repository}
            onChange={handleRepositoryChange}
            label={t('podDeployment:podDeployment.form.imageRepository')}
          >
            {repositories.map((repo) => (
              <MenuItem key={repo} value={repo}>
                {repo}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>{t('podDeployment:podDeployment.form.imageTag')}</InputLabel>
          <Select
            value={value.tag}
            onChange={handleTagChange}
            label={t('podDeployment:podDeployment.form.imageTag')}
            disabled={!value.repository}
          >
            {tags.map((tag) => (
              <MenuItem key={tag} value={tag}>
                {tag}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
};

export default ImageSelector; 