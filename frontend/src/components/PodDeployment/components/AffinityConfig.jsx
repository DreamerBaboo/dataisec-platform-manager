import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const AffinityConfig = ({ config, onChange }) => {
  const { t } = useAppTranslation();

  const handleAffinityChange = async (newAffinity) => {
    await onChange('affinity', newAffinity);
  };

  const handleNodeAffinityChange = (value) => {
    handleAffinityChange({
      ...config.affinity,
      nodeAffinity: value
    });
  };

  const handlePodAffinityChange = (value) => {
    handleAffinityChange({
      ...config.affinity,
      podAffinity: value
    });
  };

  const handlePodAntiAffinityChange = (value) => {
    handleAffinityChange({
      ...config.affinity,
      podAntiAffinity: value
    });
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        {t('podDeployment:podDeployment.affinity.nodeAffinity')}
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={4}
        value={config.affinity.nodeAffinity || ''}
        onChange={(e) => handleNodeAffinityChange(e.target.value)}
        placeholder={t('podDeployment:podDeployment.affinity.nodeAffinityPlaceholder')}
        sx={{ mb: 3 }}
      />

      <Typography variant="subtitle1" gutterBottom>
        {t('podDeployment:podDeployment.affinity.podAffinity')}
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={4}
        value={config.affinity.podAffinity || ''}
        onChange={(e) => handlePodAffinityChange(e.target.value)}
        placeholder={t('podDeployment:podDeployment.affinity.podAffinityPlaceholder')}
        sx={{ mb: 3 }}
      />

      <Typography variant="subtitle1" gutterBottom>
        {t('podDeployment:podDeployment.affinity.podAntiAffinity')}
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={4}
        value={config.affinity.podAntiAffinity || ''}
        onChange={(e) => handlePodAntiAffinityChange(e.target.value)}
        placeholder={t('podDeployment:podDeployment.affinity.podAntiAffinityPlaceholder')}
      />
    </Box>
  );
};

export default AffinityConfig; 