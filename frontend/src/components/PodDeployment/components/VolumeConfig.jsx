import React from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation'; 

const VolumeConfig = ({ volumes, onChange }) => {
  const { t } = useAppTranslation();

  const handleAddVolume = () => {
    onChange([
      ...volumes,
      {
        name: '',
        type: 'emptyDir',
        source: '',
        mountPath: ''
      }
    ]);
  };

  const handleRemoveVolume = (index) => {
    onChange(volumes.filter((_, i) => i !== index));
  };

  const handleVolumeChange = (index, field, value) => {
    const updatedVolumes = volumes.map((volume, i) => {
      if (i === index) {
        return { ...volume, [field]: value };
      }
      return volume;
    });
    onChange(updatedVolumes);
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">
          {t('podDeployment:podDeployment.volumes.title')}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddVolume}
          variant="outlined"
          size="small"
        >
          {t('podDeployment:podDeployment.volumes.add')}
        </Button>
      </Box>

      {volumes.map((volume, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.volumes.name')}
                value={volume.name}
                onChange={(e) => handleVolumeChange(index, 'name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{t('podDeployment:podDeployment.volumes.type')}</InputLabel>
                <Select
                  value={volume.type}
                  onChange={(e) => handleVolumeChange(index, 'type', e.target.value)}
                  label={t('podDeployment:podDeployment.volumes.type')}
                >
                  <MenuItem value="emptyDir">EmptyDir</MenuItem>
                  <MenuItem value="hostPath">HostPath</MenuItem>
                  <MenuItem value="persistentVolumeClaim">PVC</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {volume.type !== 'emptyDir' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t(`podDeployment:podDeployment.volumes.${volume.type === 'hostPath' ? 'path' : 'claimName'}`)}
                  value={volume.source}
                  onChange={(e) => handleVolumeChange(index, 'source', e.target.value)}
                  required
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.volumes.mountPath')}
                value={volume.mountPath}
                onChange={(e) => handleVolumeChange(index, 'mountPath', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                onClick={() => handleRemoveVolume(index)}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Paper>
      ))}
    </Box>
  );
};

export default VolumeConfig; 