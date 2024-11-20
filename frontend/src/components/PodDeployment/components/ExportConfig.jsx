import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';
import { logger } from '../../../utils/logger'; // 導入 logger

const ExportConfig = ({ config }) => {
  const { t } = useAppTranslation();

  const handleExport = () => {
    try {
      const configString = JSON.stringify(config, null, 2);
      const blob = new Blob([configString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.name || 'deployment'}-config.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Tooltip title={t('podDeployment:podDeployment.config.export')}>
      <IconButton onClick={handleExport}>
        <DownloadIcon />
      </IconButton>
    </Tooltip>
  );
};

export default ExportConfig; 