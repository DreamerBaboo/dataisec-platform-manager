import { migrateConfig, validateConfigVersion } from './configVersioning';

// 將配置轉換為 YAML 格式
export const exportToYAML = (config) => {
  const yaml = require('js-yaml');
  try {
    // 驗證配置版本
    const { isValid, errors } = validateConfigVersion(config);
    if (!isValid) {
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }

    return yaml.dump({
      version: config.version,
      timestamp: new Date().toISOString(),
      config
    });
  } catch (error) {
    throw new Error(`Failed to export configuration: ${error.message}`);
  }
};

// 從 YAML 解析配置
export const importFromYAML = (yamlString) => {
  const yaml = require('js-yaml');
  try {
    const data = yaml.load(yamlString);
    
    // 驗證版本
    if (!data.version) {
      throw new Error('Invalid configuration file: missing version');
    }

    // 驗證配置
    if (!data.config) {
      throw new Error('Invalid configuration file: missing configuration');
    }

    // 遷移到最新版本
    const migratedConfig = migrateConfig(data.config);

    // 驗證遷移後的配置
    const { isValid, errors } = validateConfigVersion(migratedConfig);
    if (!isValid) {
      throw new Error(`Invalid configuration after migration: ${errors.join(', ')}`);
    }

    return migratedConfig;
  } catch (error) {
    throw new Error(`Failed to import configuration: ${error.message}`);
  }
};

// 下載配置文件
export const downloadConfig = (config, filename = 'pod-config.yaml') => {
  try {
    const yaml = exportToYAML(config);
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(`Failed to download configuration: ${error.message}`);
  }
}; 