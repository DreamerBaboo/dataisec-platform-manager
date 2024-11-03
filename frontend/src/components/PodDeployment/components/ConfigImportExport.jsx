import React, { useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Upload as UploadIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { downloadConfig, importFromYAML } from '../../../utils/configExporter';

const ConfigImportExport = ({ config, onImport }) => {
  const { t } = useAppTranslation();
  const fileInputRef = useRef(null);
  const [error, setError] = React.useState(null);

  const handleExport = () => {
    try {
      downloadConfig(config);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        const importedConfig = importFromYAML(content);
        onImport(importedConfig);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Box>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".yaml,.yml"
        onChange={handleFileChange}
      />
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={handleImportClick}
        >
          {t('podDeployment:podDeployment.config.import')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          {t('podDeployment:podDeployment.config.export')}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ConfigImportExport; 