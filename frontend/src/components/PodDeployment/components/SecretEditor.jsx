import React from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Paper,
  Grid,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const SecretEditor = ({ secrets, onChange }) => {
  const { t } = useAppTranslation();
  const [showValues, setShowValues] = React.useState({});

  const handleAddSecret = () => {
    onChange([
      ...secrets,
      {
        name: '',
        data: {},
        mountPath: ''
      }
    ]);
  };

  const handleRemoveSecret = (index) => {
    onChange(secrets.filter((_, i) => i !== index));
  };

  const handleSecretChange = (index, field, value) => {
    const updatedSecrets = secrets.map((secret, i) => {
      if (i === index) {
        return { ...secret, [field]: value };
      }
      return secret;
    });
    onChange(updatedSecrets);
  };

  const handleDataChange = (index, key, value) => {
    const updatedSecrets = secrets.map((secret, i) => {
      if (i === index) {
        return {
          ...secret,
          data: {
            ...secret.data,
            [key]: value
          }
        };
      }
      return secret;
    });
    onChange(updatedSecrets);
  };

  const toggleValueVisibility = (index, key) => {
    setShowValues(prev => ({
      ...prev,
      [`${index}-${key}`]: !prev[`${index}-${key}`]
    }));
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1">
          {t('podDeployment:podDeployment.secrets.title')}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddSecret}
          variant="outlined"
          size="small"
        >
          {t('podDeployment:podDeployment.secrets.add')}
        </Button>
      </Box>

      {secrets.map((secret, index) => (
        <Paper key={index} sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.secrets.name')}
                value={secret.name}
                onChange={(e) => handleSecretChange(index, 'name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.secrets.mountPath')}
                value={secret.mountPath}
                onChange={(e) => handleSecretChange(index, 'mountPath', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                {t('podDeployment:podDeployment.secrets.data')}
              </Typography>
              {Object.entries(secret.data).map(([key, value]) => (
                <Box key={key} sx={{ mb: 2 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.secrets.key')}
                        value={key}
                        onChange={(e) => {
                          const newData = { ...secret.data };
                          delete newData[key];
                          handleSecretChange(index, 'data', {
                            ...newData,
                            [e.target.value]: value
                          });
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        type={showValues[`${index}-${key}`] ? 'text' : 'password'}
                        label={t('podDeployment:podDeployment.secrets.value')}
                        value={value}
                        onChange={(e) => handleDataChange(index, key, e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => toggleValueVisibility(index, key)}
                                edge="end"
                              >
                                {showValues[`${index}-${key}`] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={1}>
                      <IconButton
                        onClick={() => {
                          const newData = { ...secret.data };
                          delete newData[key];
                          handleSecretChange(index, 'data', newData);
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
                onClick={() => handleDataChange(index, `key${Object.keys(secret.data).length + 1}`, '')}
                size="small"
              >
                {t('podDeployment:podDeployment.secrets.addData')}
              </Button>
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                onClick={() => handleRemoveSecret(index)}
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

export default SecretEditor; 