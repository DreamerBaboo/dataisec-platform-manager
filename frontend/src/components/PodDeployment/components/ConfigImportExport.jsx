import React from 'react';
import { Box, Button } from '@mui/material';
import { 
  Upload as UploadIcon,
  Download as DownloadIcon 
} from '@mui/icons-material';
import { useAppTranslation } from '../../../hooks/useAppTranslation';

const ConfigImportExport = ({ config, onImport }) => {
  const { t } = useAppTranslation();

  const handleExport = () => {
    try {
      // 將配置轉換為 JSON 字符串
      const configString = JSON.stringify(config, null, 2);
      
      // 創建 Blob 對象
      const blob = new Blob([configString], { type: 'application/json' });
      
      // 創建下載鏈接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.name || 'deployment'}-config.json`;
      
      // 觸發下載
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      // 可以在這裡添加錯誤提示
    }
  };

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
        // 可以在這裡添加錯誤提示
      }
    };
    reader.readAsText(file);
    
    // 重置 input 值以允許重複導入相同文件
    event.target.value = '';
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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
          variant="outlined"
          startIcon={<UploadIcon />}
        >
          {t('podDeployment:podDeployment.config.import')}
        </Button>
      </label>
      <Button
        variant="outlined"
        startIcon={<DownloadIcon />}
        onClick={handleExport}
      >
        {t('podDeployment:podDeployment.config.export')}
      </Button>
    </Box>
  );
};

export default ConfigImportExport; 