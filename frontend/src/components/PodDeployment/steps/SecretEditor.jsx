import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  HelpOutline as HelpOutlineIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { podDeploymentService } from '../../../services/podDeploymentService';
import YAML from 'yaml';
import { MonacoEditor } from '../../common/MonacoEditor';

const SECRET_TYPES = {
  OPAQUE: 'Opaque',
  SERVICE_ACCOUNT: 'kubernetes.io/service-account-token',
  DOCKER_CONFIG_LEGACY: 'kubernetes.io/dockercfg',
  DOCKER_CONFIG: 'kubernetes.io/dockerconfigjson',
  BASIC_AUTH: 'kubernetes.io/basic-auth',
  SSH_AUTH: 'kubernetes.io/ssh-auth',
  TLS: 'kubernetes.io/tls',
  BOOTSTRAP_TOKEN: 'bootstrap.kubernetes.io/token'
};

const SECRET_TYPE_INFO = {
  [SECRET_TYPES.OPAQUE]: {
    description: 'podDeployment:secret.typeInfo.opaque',
    multipleEntries: true,
    examples: {
      key: 'e.g., username',
      value: 'e.g., admin'
    }
  },
  [SECRET_TYPES.SERVICE_ACCOUNT]: {
    description: 'podDeployment:secret.typeInfo.serviceAccount',
    multipleEntries: false,
    examples: {
      token: 'Service account token will be auto-generated'
    }
  },
  [SECRET_TYPES.DOCKER_CONFIG]: {
    description: 'podDeployment:secret.typeInfo.dockerConfig',
    multipleEntries: false,
    examples: {
      registry: 'e.g., docker.io',
      username: 'Docker registry username',
      password: 'Docker registry password',
      email: 'Docker registry email'
    }
  },
  [SECRET_TYPES.BASIC_AUTH]: {
    description: 'podDeployment:secret.typeInfo.basicAuth',
    multipleEntries: false,
    examples: {
      username: 'Basic auth username',
      password: 'Basic auth password'
    }
  },
  [SECRET_TYPES.SSH_AUTH]: {
    description: 'podDeployment:secret.typeInfo.sshAuth',
    multipleEntries: false,
    examples: {
      'ssh-privatekey': 'SSH private key content'
    }
  },
  [SECRET_TYPES.TLS]: {
    description: 'podDeployment:secret.typeInfo.tls',
    multipleEntries: false,
    examples: {
      'tls.crt': 'TLS certificate content',
      'tls.key': 'TLS private key content'
    }
  },
  [SECRET_TYPES.BOOTSTRAP_TOKEN]: {
    description: 'podDeployment:secret.typeInfo.bootstrapToken',
    multipleEntries: false,
    examples: {
      token: 'Bootstrap token value'
    }
  }
};

const validateTLSCertificate = (cert) => {
  const certRegex = /^-----BEGIN CERTIFICATE-----\n[\s\S]*\n-----END CERTIFICATE-----$/;
  return certRegex.test(cert);
};

const validateTLSPrivateKey = (key) => {
  const keyRegex = /^-----BEGIN PRIVATE KEY-----\n[\s\S]*\n-----END PRIVATE KEY-----$/;
  return keyRegex.test(key);
};

const validateSSHPrivateKey = (key) => {
  const keyRegex = /^-----BEGIN (?:RSA|OPENSSH) PRIVATE KEY-----\n[\s\S]*\n-----END (?:RSA|OPENSSH) PRIVATE KEY-----$/;
  return keyRegex.test(key);
};

const btoa = (str) => {
  try {
    return window.btoa(str);
  } catch (err) {
    // Handle non-Latin1 characters
    return window.btoa(unescape(encodeURIComponent(str)));
  }
};

const SecretEditor = ({ config, onChange, errors = {} }) => {
  const { t } = useAppTranslation();
  const [secrets, setSecrets] = useState([]);
  const [showYaml, setShowYaml] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [editIndex, setEditIndex] = useState(null);
  const [localErrors, setLocalErrors] = useState({});
  const [showValues, setShowValues] = useState({});
  const [newSecret, setNewSecret] = useState({
    name: '',
    type: '',
    data: {
      entries: []
    }
  });

  // Load existing configuration when component mounts
  useEffect(() => {
    if (config?.secrets) {
      setSecrets(config.secrets);
    }
  }, [config?.secrets]);

  const handleCreateSecret = () => {
    setSelectedType('');
    setNewSecret({
      name: '',
      type: '',
      data: {
        entries: []
      }
    });
    setCreateDialogOpen(true);
  };

  const handleTypeSelect = (type) => {
    if (!Object.values(SECRET_TYPES).includes(type)) {
      return;
    }

    const typeForName = type.toLowerCase().replace(/kubernetes\.io\//g, '');
    const secretName = `${config.name}-${typeForName}-secret`;

    setSelectedType(type);
    setNewSecret({
      name: secretName,
      type,
      data: getDefaultDataForType(type)
    });
  };

  const getDefaultDataForType = (type) => {
    switch (type) {
      case SECRET_TYPES.OPAQUE:
        return {
          entries: [{ key: '', value: '' }]
        };
      case SECRET_TYPES.DOCKER_CONFIG:
      case SECRET_TYPES.DOCKER_CONFIG_LEGACY:
        return {
          registry: 'docker.io',
          username: '',
          password: '',
          email: ''
        };
      case SECRET_TYPES.BASIC_AUTH:
        return {
          username: '',
          password: ''
        };
      case SECRET_TYPES.SSH_AUTH:
        return {
          'ssh-privatekey': ''
        };
      case SECRET_TYPES.TLS:
        return {
          'tls.crt': '',
          'tls.key': ''
        };
      case SECRET_TYPES.SERVICE_ACCOUNT:
        return {
          token: ''
        };
      case SECRET_TYPES.BOOTSTRAP_TOKEN:
        return {
          'token-id': '',
          'token-secret': ''
        };
      default:
        return {
          entries: []
        };
    }
  };

  const renderTypeSpecificFields = () => {
    switch (selectedType) {
      case SECRET_TYPES.OPAQUE:
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {newSecret.data.entries.map((entry, index) => (
                <Grid item xs={12} key={index}>
                  <Grid container spacing={2}>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.secret.fields.key')}
                        value={entry.key}
                        onChange={(e) => handleEntryChange(index, 'key', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label={t('podDeployment:podDeployment.secret.fields.value')}
                        value={entry.value}
                        onChange={(e) => handleEntryChange(index, 'value', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <IconButton onClick={() => handleRemoveEntry(index)}>
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Grid>
              ))}
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddEntry}
                >
                  {t('podDeployment:podDeployment.secret.actions.addEntry')}
                </Button>
              </Grid>
            </Grid>
          </Box>
        );

      case SECRET_TYPES.DOCKER_CONFIG:
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('podDeployment:podDeployment.secret.fields.registry')}
                  value={newSecret.data.registry || ''}
                  onChange={(e) => handleDataChange('registry', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('podDeployment:podDeployment.secret.fields.username')}
                  value={newSecret.data.username || ''}
                  onChange={(e) => handleDataChange('username', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label={t('podDeployment:podDeployment.secret.fields.password')}
                  value={newSecret.data.password || ''}
                  onChange={(e) => handleDataChange('password', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('podDeployment:podDeployment.secret.fields.email')}
                  value={newSecret.data.email || ''}
                  onChange={(e) => handleDataChange('email', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case SECRET_TYPES.TLS:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
              {t('podDeployment:podDeployment.secret.fields.certificate')}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <MonacoEditor
                value={newSecret.data['tls.crt'] || ''}
                onChange={(value) => handleDataChange('tls.crt', value)}
                language="plaintext"
                height="300px"
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  readOnly: false,
                  fontSize: 14
                }}
              />
            </Paper>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
              {t('podDeployment:podDeployment.secret.fields.privateKey')}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <MonacoEditor
                value={newSecret.data['tls.key'] || ''}
                onChange={(value) => handleDataChange('tls.key', value)}
                language="plaintext"
                height="300px"
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  readOnly: false,
                  fontSize: 14
                }}
              />
            </Paper>
          </Box>
        );

      case SECRET_TYPES.SERVICE_ACCOUNT:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
              {t('podDeployment:podDeployment.secret.fields.serviceAccountToken')}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <MonacoEditor
                value={newSecret.data.token || ''}
                onChange={(value) => handleDataChange('token', value)}
                language="plaintext"
                height="200px"
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  readOnly: false,
                  fontSize: 14,
                  wordWrap: 'on'
                }}
              />
            </Paper>
          </Box>
        );

      case SECRET_TYPES.BASIC_AUTH:
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('podDeployment:podDeployment.secret.fields.username')}
                  value={newSecret.data.username || ''}
                  onChange={(e) => handleDataChange('username', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label={t('podDeployment:podDeployment.secret.fields.password')}
                  value={newSecret.data.password || ''}
                  onChange={(e) => handleDataChange('password', e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowValues(prev => ({
                            ...prev,
                            'basic-auth-password': !prev['basic-auth-password']
                          }))}
                          edge="end"
                        >
                          {showValues['basic-auth-password'] ? 
                            <VisibilityOffIcon /> : 
                            <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case SECRET_TYPES.SSH_AUTH:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
              {t('podDeployment:podDeployment.secret.fields.sshPrivateKey')}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <MonacoEditor
                value={newSecret.data['ssh-privatekey'] || ''}
                onChange={(value) => handleDataChange('ssh-privatekey', value)}
                language="plaintext"
                height="300px"
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  readOnly: false,
                  fontSize: 14,
                  wordWrap: 'on',
                  fontFamily: "'Courier New', monospace"
                }}
              />
            </Paper>
          </Box>
        );

      case SECRET_TYPES.DOCKER_CONFIG_LEGACY:
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('podDeployment:podDeployment.secret.fields.registry')}
                  value={newSecret.data.registry || ''}
                  onChange={(e) => handleDataChange('registry', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('podDeployment:podDeployment.secret.fields.username')}
                  value={newSecret.data.username || ''}
                  onChange={(e) => handleDataChange('username', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label={t('podDeployment:podDeployment.secret.fields.password')}
                  value={newSecret.data.password || ''}
                  onChange={(e) => handleDataChange('password', e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowValues(prev => ({
                            ...prev,
                            'docker-legacy-password': !prev['docker-legacy-password']
                          }))}
                          edge="end"
                        >
                          {showValues['docker-legacy-password'] ? 
                            <VisibilityOffIcon /> : 
                            <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('podDeployment:podDeployment.secret.fields.email')}
                  value={newSecret.data.email || ''}
                  onChange={(e) => handleDataChange('email', e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case SECRET_TYPES.BOOTSTRAP_TOKEN:
        return (
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('podDeployment:podDeployment.secret.fields.tokenId')}
                  value={newSecret.data['token-id'] || ''}
                  onChange={(e) => handleDataChange('token-id', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label={t('podDeployment:podDeployment.secret.fields.tokenSecret')}
                  value={newSecret.data['token-secret'] || ''}
                  onChange={(e) => handleDataChange('token-secret', e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowValues(prev => ({
                            ...prev,
                            'bootstrap-token-secret': !prev['bootstrap-token-secret']
                          }))}
                          edge="end"
                        >
                          {showValues['bootstrap-token-secret'] ? 
                            <VisibilityOffIcon /> : 
                            <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );

      default:
        return null;
    }
  };

  const handleSaveSecret = async () => {
    if (!validateSecret()) return;

    try {
      const updatedSecrets = [...secrets];
      if (editIndex !== null) {
        updatedSecrets[editIndex] = newSecret;
      } else {
        if (updatedSecrets.some(s => s.name === newSecret.name)) {
          setLocalErrors({
            submit: t('podDeployment:podDeployment.secret.errors.duplicateName')
          });
          return;
        }
        updatedSecrets.push(newSecret);
      }

      await saveSecrets(updatedSecrets);
      setCreateDialogOpen(false);
      setEditIndex(null);
      setNewSecret({
        type: '',
        name: '',
        data: {
          entries: []
        }
      });
    } catch (error) {
      console.error('Failed to save Secret:', error);
      setLocalErrors({
        submit: t('podDeployment:podDeployment.secret.errors.saveFailed')
      });
    }
  };

  const validateSecret = () => {
    const errors = {};

    switch (selectedType) {
      case SECRET_TYPES.OPAQUE:
        newSecret.data.entries?.forEach((entry, index) => {
          if (!entry.key) {
            errors[`entry-${index}-key`] = t('podDeployment:podDeployment.secret.validation.keyRequired');
          }
          if (!entry.value) {
            errors[`entry-${index}-value`] = t('podDeployment:podDeployment.secret.validation.valueRequired');
          }
        });
        break;

      case SECRET_TYPES.TLS:
        if (!validateTLSCertificate(newSecret.data['tls.crt'])) {
          errors['tls.crt'] = t('podDeployment:podDeployment.secret.validation.invalidCertificate');
        }
        if (!validateTLSPrivateKey(newSecret.data['tls.key'])) {
          errors['tls.key'] = t('podDeployment:podDeployment.secret.validation.invalidPrivateKey');
        }
        break;

      case SECRET_TYPES.SSH_AUTH:
        if (!validateSSHPrivateKey(newSecret.data['ssh-privatekey'])) {
          errors['ssh-privatekey'] = t('podDeployment:podDeployment.secret.validation.invalidSSHKey');
        }
        break;

      case SECRET_TYPES.DOCKER_CONFIG:
        if (!newSecret.data.username) {
          errors.username = t('podDeployment:podDeployment.secret.validation.usernameRequired');
        }
        if (!newSecret.data.password) {
          errors.password = t('podDeployment:podDeployment.secret.validation.passwordRequired');
        }
        break;
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveSecrets = async (updatedSecrets) => {
    try {
      // Filter out any invalid or incomplete secrets
      const validSecrets = updatedSecrets.filter(secret => {
        // Skip if secret has no data
        if (!secret.data || Object.keys(secret.data).length === 0) {
          return false;
        }

        switch (secret.type) {
          case SECRET_TYPES.OPAQUE:
            return secret.data.entries?.some(entry => entry.key && entry.value);
          case SECRET_TYPES.DOCKER_CONFIG:
          case SECRET_TYPES.DOCKER_CONFIG_LEGACY:
            return secret.data.username && 
                   secret.data.password && 
                   secret.data.registry;
          case SECRET_TYPES.TLS:
            return secret.data['tls.crt'] && 
                   secret.data['tls.key'];
          case SECRET_TYPES.BASIC_AUTH:
            return secret.data.username && 
                   secret.data.password;
          case SECRET_TYPES.SSH_AUTH:
            return secret.data['ssh-privatekey'];
          case SECRET_TYPES.SERVICE_ACCOUNT:
            return secret.data.token;
          case SECRET_TYPES.BOOTSTRAP_TOKEN:
            return secret.data['token-id'] && 
                   secret.data['token-secret'];
          default:
            return false;
        }
      });

      // Save to config.json first
      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        {
          ...config,
          secrets: validSecrets
        }
      );

      // Generate and save YAML if there are valid Secrets
      if (validSecrets.length > 0) {
        const secretYaml = generateSecretYaml(validSecrets);
        await podDeploymentService.saveDeployScript(
          config.name,
          config.version,
          `${config.name}-${config.version}-secret.yaml`,
          secretYaml
        );
      }

      // Update state and parent config
      setSecrets(validSecrets);
      onChange({
        ...config,
        secrets: validSecrets
      });

    } catch (error) {
      console.error('Failed to save Secrets:', error);
      throw error;
    }
  };

  // Add cleanup function
  const cleanupSecretYaml = async () => {
    console.log ('config name', config.name);
  if (!config?.name || !config?.version) return;
  try {
    await podDeploymentService.deleteDeployScript(
        config.name,
        config.version,
        `${config.name}-${config.version}-secret.yaml`
      );
      console.log('✅ Secret YAML deleted successfully');
  } catch (error) {
      // Ignore 404 errors (file doesn't exist)
      if (error.response?.status !== 404) {
        console.error('Failed to cleanup Secret YAML:', error);
    }
    }
  };
  const handleDeleteSecret = async (index) => {
    try {
      // Create updated secrets array first
      const updatedSecrets = secrets.filter((_, i) => i !== index);

      // Update local state first for immediate UI feedback
      setSecrets(updatedSecrets);

      // Save to config.json first
      await podDeploymentService.saveDeploymentConfig(
        config.name,
        config.version,
        {
          ...config,
          secrets: updatedSecrets
        }
      );

      // Update parent config
      onChange({
        ...config,
        secrets: updatedSecrets
      });
      // Handle YAML file based on remaining secrets
      if (updatedSecrets.length > 0) {
        // Generate and save new YAML if there are still secrets
        const secretYaml = generateSecretYaml(updatedSecrets);
          await podDeploymentService.saveDeployScript(
            config.name,
            config.version,
            `${config.name}-${config.version}-secret.yaml`,
            secretYaml
          )
      } else {
        // Delete YAML file if no secrets left
        await cleanupSecretYaml();
      }

    } catch (error) {
      console.error('Failed to delete Secret:', error);
      setLocalErrors({
        submit: t('podDeployment:podDeployment.secret.errors.deleteFailed')
      });
    }
  };

  const handleAddEntry = () => {
    const updatedSecret = { ...newSecret };
    if (!updatedSecret.data.entries) {
      updatedSecret.data.entries = [];
    }
    updatedSecret.data.entries.push({ key: '', value: '' });
    setNewSecret(updatedSecret);
  };

  const handleRemoveEntry = (index) => {
    const updatedSecret = { ...newSecret };
    updatedSecret.data.entries = updatedSecret.data.entries.filter((_, i) => i !== index);
    console.log ('remove entery');
    setNewSecret(updatedSecret);
  };

  const handleDataChange = (field, value) => {
    setNewSecret(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [field]: value
      }
    }));
  };

  const handleEntryChange = (index, field, value) => {
    const updatedSecret = { ...newSecret };
    if (!updatedSecret.data.entries) {
      updatedSecret.data.entries = [];
    }
    updatedSecret.data.entries[index] = {
      ...updatedSecret.data.entries[index],
      [field]: value
    };
    setNewSecret(updatedSecret);
  };

  const generateSecretYaml = (secrets) => {
    if (!secrets.length) return '';

    return secrets.map(secret => {
      // Skip if secret has no data
      if (!secret.data || Object.keys(secret.data).length === 0) {
        return null;
      }

      const yaml = {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: secret.name,
          namespace: config.namespace || 'default'
        },
        type: secret.type,
        data: {}
      };

      // Convert data to base64 using btoa
      if (secret.type === SECRET_TYPES.OPAQUE) {
        if (!secret.data.entries?.length) return null;
        secret.data.entries?.forEach(entry => {
          if (entry.key && entry.value) {
            yaml.data[entry.key] = btoa(entry.value || '');
          }
        });
      } else if (secret.type === SECRET_TYPES.DOCKER_CONFIG) {
        if (!secret.data.username || !secret.data.password) return null;
        const dockerConfig = {
          auths: {
            [secret.data.registry || 'docker.io']: {
              username: secret.data.username,
              password: secret.data.password,
              email: secret.data.email,
              auth: btoa(`${secret.data.username}:${secret.data.password}`)
            }
          }
        };
        yaml.data['.dockerconfigjson'] = btoa(JSON.stringify(dockerConfig));
      } else if (secret.type === SECRET_TYPES.TLS) {
        if (!secret.data['tls.crt'] || !secret.data['tls.key']) return null;
        yaml.data['tls.crt'] = btoa(secret.data['tls.crt'] || '');
        yaml.data['tls.key'] = btoa(secret.data['tls.key'] || '');
      } else if (secret.type === SECRET_TYPES.BASIC_AUTH) {
        if (!secret.data.username || !secret.data.password) return null;
        yaml.data.username = btoa(secret.data.username || '');
        yaml.data.password = btoa(secret.data.password || '');
      } else if (secret.type === SECRET_TYPES.SSH_AUTH) {
        if (!secret.data['ssh-privatekey']) return null;
        yaml.data['ssh-privatekey'] = btoa(secret.data['ssh-privatekey'] || '');
      }

      // Only return YAML if there is actual data
      return Object.keys(yaml.data).length > 0 ? YAML.stringify(yaml) : null;
    }).filter(Boolean).join('\n---\n');
  };

  // Add SecretDisplay component
  const SecretDisplay = ({ secret, onEdit, onDelete, showValues, setShowValues }) => {
    const { t } = useAppTranslation();

    // Add null check for secret type
    if (!secret || !secret.type || !SECRET_TYPE_INFO[secret.type]) {
      return null;
    }

    const renderContent = () => {
      switch (secret.type) {
        case SECRET_TYPES.OPAQUE:
          return (
            <Box>
              {secret.data.entries?.map((entry, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      label={t('podDeployment:podDeployment.secret.fields.key')}
                      value={entry.key}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={7}>
                    <TextField
                      fullWidth
                      type={showValues[`${secret.name}-${index}`] ? 'text' : 'password'}
                      label={t('podDeployment:podDeployment.secret.fields.value')}
                      value={entry.value}
                      disabled
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowValues(prev => ({
                                ...prev,
                                [`${secret.name}-${index}`]: !prev[`${secret.name}-${index}`]
                              }))}
                              edge="end"
                            >
                              {showValues[`${secret.name}-${index}`] ? 
                                <VisibilityOffIcon /> : 
                                <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                </Grid>
              ))}
            </Box>
          );

        case SECRET_TYPES.SERVICE_ACCOUNT:
          return (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('podDeployment:podDeployment.secret.fields.serviceAccountToken')}
              </Typography>
              <TextField
                fullWidth
                type={showValues[`${secret.name}-token`] ? 'text' : 'password'}
                value={secret.data.token || ''}
                disabled
                multiline
                rows={4}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowValues(prev => ({
                          ...prev,
                          [`${secret.name}-token`]: !prev[`${secret.name}-token`]
                        }))}
                        edge="end"
                      >
                        {showValues[`${secret.name}-token`] ? 
                          <VisibilityOffIcon /> : 
                          <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          );

        case SECRET_TYPES.DOCKER_CONFIG_LEGACY:
        case SECRET_TYPES.DOCKER_CONFIG:
          return (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('podDeployment:podDeployment.secret.fields.registry')}
                    value={secret.data.registry}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('podDeployment:podDeployment.secret.fields.username')}
                    value={secret.data.username}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type={showValues[`${secret.name}-password`] ? 'text' : 'password'}
                    label={t('podDeployment:podDeployment.secret.fields.password')}
                    value={secret.data.password}
                    disabled
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowValues(prev => ({
                              ...prev,
                              [`${secret.name}-password`]: !prev[`${secret.name}-password`]
                            }))}
                            edge="end"
                          >
                            {showValues[`${secret.name}-password`] ? 
                              <VisibilityOffIcon /> : 
                              <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('podDeployment:podDeployment.secret.fields.email')}
                    value={secret.data.email}
                    disabled
                  />
                </Grid>
              </Grid>
            </Box>
          );

        case SECRET_TYPES.BASIC_AUTH:
          return (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('podDeployment:podDeployment.secret.fields.username')}
                    value={secret.data.username}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type={showValues[secret.name] ? 'text' : 'password'}
                    label={t('podDeployment:podDeployment.secret.fields.password')}
                    value={secret.data.password}
                    disabled
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowValues(prev => ({
                              ...prev,
                              [secret.name]: !prev[secret.name]
                            }))}
                            edge="end"
                          >
                            {showValues[secret.name] ? 
                              <VisibilityOffIcon /> : 
                              <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          );

        case SECRET_TYPES.SSH_AUTH:
          return (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t('podDeployment:podDeployment.secret.fields.sshPrivateKey')}
              </Typography>
              <MonacoEditor
                value={secret.data['ssh-privatekey'] || ''}
                language="plaintext"
                height="200px"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  fontFamily: "'Courier New', monospace"
                }}
              />
            </Box>
          );

        case SECRET_TYPES.BOOTSTRAP_TOKEN:
          return (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('podDeployment:podDeployment.secret.fields.tokenId')}
                    value={secret.data['token-id']}
                    disabled
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="password"
                    label={t('podDeployment:podDeployment.secret.fields.tokenSecret')}
                    value={secret.data['token-secret']}
                    disabled
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowValues(prev => ({
                              ...prev,
                              [secret.name]: !prev[secret.name]
                            }))}
                            edge="end"
                          >
                            {showValues[secret.name] ? 
                              <VisibilityOffIcon /> : 
                              <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          );

        default:
          return null;
      }
    };

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1">
              {secret.name} ({t(`podDeployment:podDeployment.secret.types.${secret.type.toLowerCase()}`)})
            </Typography>
            {SECRET_TYPE_INFO[secret.type] && (
              <Tooltip title={t(SECRET_TYPE_INFO[secret.type].description)}>
                <IconButton size="small">
                  <HelpOutlineIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box>
            <IconButton onClick={() => onEdit(secret)}>
              <EditIcon />
            </IconButton>
            <IconButton color="error" onClick={() => onDelete(secret)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
        {renderContent()}
      </Paper>
    );
  };

  return (
    <Box>
      {/* Header with Create and Preview buttons */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {t('podDeployment:podDeployment.secret.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={showYaml ? <VisibilityOffIcon /> : <VisibilityIcon />}
            onClick={() => setShowYaml(!showYaml)}
          >
            {showYaml 
              ? t('podDeployment:podDeployment.secret.hidePreview')
              : t('podDeployment:podDeployment.secret.showPreview')
            }
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateSecret}
          >
            {t('podDeployment:podDeployment.secret.add')}
          </Button>
        </Box>
      </Box>

      {/* YAML Preview */}
      {showYaml && secrets.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('podDeployment:podDeployment.secret.preview')}
          </Typography>
          <pre style={{ 
            margin: 0, 
            whiteSpace: 'pre-wrap',
            backgroundColor: '#f5f5f5',
            padding: '16px',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {generateSecretYaml(secrets)}
          </pre>
        </Paper>
      )}

      {/* Secret List */}
      {secrets.map((secret, index) => (
        <SecretDisplay
          key={index}
          secret={secret}
          showValues={showValues}
          //setShowValues={setShowValues}
          onEdit={(s) => {
            setEditIndex(index);
            setSelectedType(s.type);
            setNewSecret(s);
            setCreateDialogOpen(true);
          }}
          onDelete={() => handleDeleteSecret(index)}
        />
      ))}

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {editIndex !== null 
            ? t('podDeployment:podDeployment.secret.edit')
            : t('podDeployment:podDeployment.secret.create')
          }
        </DialogTitle>
        <DialogContent sx={{ width: '100%', p: 3 }}>
          <Grid container spacing={2}>
            {/* Secret Type Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>
                  {t('podDeployment:podDeployment.secret.type')}
                </InputLabel>
                <Select
                  value={selectedType}
                  onChange={(e) => handleTypeSelect(e.target.value)}
                  label={t('podDeployment:podDeployment.secret.type')}
                >
                  {Object.entries(SECRET_TYPES).map(([key, value]) => (
                    <MenuItem key={key} value={value}>
                      {t(`podDeployment:secret.types.${key.toLowerCase()}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Secret Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('podDeployment:podDeployment.secret.fields.name')}
                value={newSecret.name}
                onChange={(e) => setNewSecret(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                helperText={t('podDeployment:podDeployment.secret.nameHelp')}
              />
            </Grid>

            {/* Type-specific fields */}
            <Grid item xs={12} sx={{ width: '100%' }}>
              {renderTypeSpecificFields()}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            {t('common:common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSecret}
          >
            {t('common:common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecretEditor; 