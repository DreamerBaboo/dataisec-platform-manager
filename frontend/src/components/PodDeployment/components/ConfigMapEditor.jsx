import React from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Grid
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const ConfigMapEditor = ({ configMaps, onChange }) => {
  const { t } = useAppTranslation();

  const handleAddConfigMap = () => {
    onChange([
      ...configMaps,
      {
        name: '',
        data: {},
        mountPath: ''
      }
    ]);
  };

  const handleRemoveConfigMap = (index) => {
    onChange(configMaps.filter((_, i) => i !== index));
  };

  const handleConfigMapChange = (index, field, value) => {
    const updatedConfigMaps = configMaps.map((cm, i) => {
      if (i === index) {
        return { ...cm, [field]: value };
      }
      return cm;
    });
    onChange(updatedConfigMaps);
  };

  const handleDataChange = (index, key, value) => {
    const updatedConfigMaps = configMaps.map((cm, i) => {
      if (i === index) {
        return {
          ...cm,
          data: {
            ...cm.data,
            [key]: value
          }
        };
      }
      return cm;
    });
    onChange(updatedConfigMaps);
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">
          {t('podDeployment:podDeployment.configMaps.title')}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddConfigMap}
          variant="outlined"
          size="small"
        >
          {t('podDeployment:podDeployment.configMaps.add')}
        </Button>
      </Box>

      {configMaps.map((cm, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.configMaps.name')}
                value={cm.name}
                onChange={(e) => handleConfigMapChange(index, 'name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.configMaps.mountPath')}
                value={cm.mountPath}
                onChange={(e) => handleConfigMapChange(index, 'mountPath', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                {t('podDeployment:podDeployment.configMaps.data')}
              </Typography>
              {Object.entries(cm.data).map(([key, value]) => (
                <Box key={key} sx={{ mb: 2 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.configMaps.key')}
                        value={key}
                        onChange={(e) => {
                          const newData = { ...cm.data };
                          delete newData[key];
                          handleConfigMapChange(index, 'data', {
                            ...newData,
                            [e.target.value]: value
                          });
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.configMaps.value')}
                        value={value}
                        onChange={(e) => handleDataChange(index, key, e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={1}>
                      <IconButton
                        onClick={() => {
                          const newData = { ...cm.data };
                          delete newData[key];
                          handleConfigMapChange(index, 'data', newData);
                        }}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => handleDataChange(index, `key${Object.keys(cm.data).length + 1}`, '')}
                size="small"
              >
                {t('podDeployment:podDeployment.configMaps.addData')}
              </Button>
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                onClick={() => handleRemoveConfigMap(index)}
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

export default ConfigMapEditor; 