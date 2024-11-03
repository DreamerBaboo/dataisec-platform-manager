import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  Box
} from '@mui/material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const ResourceConfig = ({ resources, onChange }) => {
  const { t } = useAppTranslation();

  const handleChange = (type, resource, value) => {
    onChange({
      ...resources,
      [type]: {
        ...resources[type],
        [resource]: value
      }
    });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {t('podDeployment:podDeployment.resources.requests')}
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('podDeployment:podDeployment.resources.cpu')}
            value={resources.requests.cpu}
            onChange={(e) => handleChange('requests', 'cpu', e.target.value)}
            helperText={t('podDeployment:podDeployment.resources.cpuHelp')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('podDeployment:podDeployment.resources.memory')}
            value={resources.requests.memory}
            onChange={(e) => handleChange('requests', 'memory', e.target.value)}
            helperText={t('podDeployment:podDeployment.resources.memoryHelp')}
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" gutterBottom>
        {t('podDeployment:podDeployment.resources.limits')}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('podDeployment:podDeployment.resources.cpu')}
            value={resources.limits.cpu}
            onChange={(e) => handleChange('limits', 'cpu', e.target.value)}
            helperText={t('podDeployment:podDeployment.resources.cpuHelp')}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label={t('podDeployment:podDeployment.resources.memory')}
            value={resources.limits.memory}
            onChange={(e) => handleChange('limits', 'memory', e.target.value)}
            helperText={t('podDeployment:podDeployment.resources.memoryHelp')}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ResourceConfig; 