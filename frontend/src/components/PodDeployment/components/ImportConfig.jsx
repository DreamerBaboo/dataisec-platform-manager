import React from 'react';
import { Button } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const ImportConfig = ({ onImport }) => {
  const { t } = useAppTranslation();

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedConfig = JSON.parse(e.target.result);
        onImport(importedConfig);
      } catch (error) {
        console.error('Import failed:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <>
      <input
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        id="import-config"
        onChange={handleImport}
      />
      <label htmlFor="import-config">
        <Button
          component="span"
          variant="contained"
          startIcon={<UploadIcon />}
        >
          {t('podDeployment:podDeployment.config.import')}
        </Button>
      </label>
    </>
  );
};

export default ImportConfig; 