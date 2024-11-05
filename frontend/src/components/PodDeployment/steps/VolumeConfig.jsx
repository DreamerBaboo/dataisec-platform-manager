import React from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Alert,
  Button,
  IconButton,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const VolumeConfig = ({ config, onChange, errors }) => {
  const { t } = useAppTranslation();

  const handleAddVolume = () => {
    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        volumes: [
          ...(config.yamlTemplate?.volumes || []),
          {
            name: '',
            type: 'hostPath',
            mountPath: '',
            hostPath: '',
            claimName: '',
            configMapName: '',
            secretName: ''
          }
        ]
      }
    });
  };

  const handleRemoveVolume = (index) => {
    const newVolumes = [...(config.yamlTemplate?.volumes || [])];
    newVolumes.splice(index, 1);
    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        volumes: newVolumes
      }
    });
  };

  const handleVolumeChange = (index, field, value) => {
    const newVolumes = [...(config.yamlTemplate?.volumes || [])];
    newVolumes[index] = {
      ...newVolumes[index],
      [field]: value
    };
    onChange({
      ...config,
      yamlTemplate: {
        ...config.yamlTemplate,
        volumes: newVolumes
      }
    });
  };

  const generateVolumePreview = (volumes) => {
    if (!volumes?.length) return '';

    return volumes.map(vol => {
      let volumeSpec = '';
      switch (vol.type) {
        case 'hostPath':
          volumeSpec = `  hostPath:\n    path: ${vol.hostPath}`;
          break;
        case 'persistentVolumeClaim':
          volumeSpec = `  persistentVolumeClaim:\n    claimName: ${vol.claimName}`;
          break;
        case 'configMap':
          volumeSpec = `  configMap:\n    name: ${vol.configMapName}`;
          break;
        case 'secret':
          volumeSpec = `  secret:\n    secretName: ${vol.secretName}`;
          break;
      }

      return `- name: ${vol.name}
${volumeSpec}
  mountPath: ${vol.mountPath}`;
    }).join('\n---\n');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('podDeployment:podDeployment.volumes.title')}
      </Typography>

      {errors?.volumes && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.volumes}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleAddVolume}
        >
          {t('podDeployment:podDeployment.volumes.add')}
        </Button>
      </Box>

      <Grid container spacing={2}>
        {config.yamlTemplate?.volumes?.map((volume, index) => (
          <Grid item xs={12} key={index}>
            <Card variant="outlined">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={t('podDeployment:podDeployment.volumes.name')}
                      value={volume.name}
                      onChange={(e) => handleVolumeChange(index, 'name', e.target.value)}
                      error={!!errors?.volumes?.[index]?.name}
                      helperText={errors?.volumes?.[index]?.name}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>
                        {t('podDeployment:podDeployment.volumes.type')}
                      </InputLabel>
                      <Select
                        value={volume.type}
                        onChange={(e) => handleVolumeChange(index, 'type', e.target.value)}
                        label={t('podDeployment:podDeployment.volumes.type')}
                      >
                        <MenuItem value="hostPath">Host Path</MenuItem>
                        <MenuItem value="persistentVolumeClaim">Persistent Volume Claim</MenuItem>
                        <MenuItem value="configMap">Config Map</MenuItem>
                        <MenuItem value="secret">Secret</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('podDeployment:podDeployment.volumes.mountPath')}
                      value={volume.mountPath}
                      onChange={(e) => handleVolumeChange(index, 'mountPath', e.target.value)}
                      error={!!errors?.volumes?.[index]?.mountPath}
                      helperText={errors?.volumes?.[index]?.mountPath}
                    />
                  </Grid>
                  {volume.type === 'hostPath' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.volumes.hostPath')}
                        value={volume.hostPath}
                        onChange={(e) => handleVolumeChange(index, 'hostPath', e.target.value)}
                      />
                    </Grid>
                  )}
                  {volume.type === 'persistentVolumeClaim' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.volumes.claimName')}
                        value={volume.claimName}
                        onChange={(e) => handleVolumeChange(index, 'claimName', e.target.value)}
                      />
                    </Grid>
                  )}
                  {volume.type === 'configMap' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.volumes.configMapName')}
                        value={volume.configMapName}
                        onChange={(e) => handleVolumeChange(index, 'configMapName', e.target.value)}
                      />
                    </Grid>
                  )}
                  {volume.type === 'secret' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.volumes.secretName')}
                        value={volume.secretName}
                        onChange={(e) => handleVolumeChange(index, 'secretName', e.target.value)}
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <IconButton
                  color="error"
                  onClick={() => handleRemoveVolume(index)}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {config.yamlTemplate?.volumes?.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('podDeployment:podDeployment.volumes.preview')}
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {generateVolumePreview(config.yamlTemplate.volumes)}
            </pre>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default VolumeConfig; 