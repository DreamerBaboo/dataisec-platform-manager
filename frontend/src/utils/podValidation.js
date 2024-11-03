const validatePodConfig = (config) => {
  const errors = {};

  // 基本信息驗證
  if (!config.name) {
    errors.name = '部署名稱不能為空';
  } else if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(config.name)) {
    errors.name = '部署名稱只能包含小寫字母、數字和連字符，且必須以字母或數字開頭和結尾';
  }

  if (!config.namespace) {
    errors.namespace = '命名空間不能為空';
  }

  if (!config.image.repository) {
    errors.imageRepository = '鏡像倉庫不能為空';
  }

  if (!config.image.tag) {
    errors.imageTag = '鏡像標籤不能為空';
  }

  // 資源配置驗證
  const { resources } = config;
  if (resources) {
    // CPU 格式驗證
    const cpuPattern = /^[0-9]+m?$|^[0-9]+\.[0-9]+$/;
    if (resources.requests?.cpu && !cpuPattern.test(resources.requests.cpu)) {
      errors.cpuRequest = 'CPU 請求格式無效 (例如: 100m 或 0.1)';
    }
    if (resources.limits?.cpu && !cpuPattern.test(resources.limits.cpu)) {
      errors.cpuLimit = 'CPU 限制格式無效 (例如: 100m 或 0.1)';
    }

    // 記憶體格式驗證
    const memoryPattern = /^[0-9]+(Ki|Mi|Gi|Ti|Pi|Ei)?$/;
    if (resources.requests?.memory && !memoryPattern.test(resources.requests.memory)) {
      errors.memoryRequest = '記憶體請求格式無效 (例如: 128Mi)';
    }
    if (resources.limits?.memory && !memoryPattern.test(resources.limits.memory)) {
      errors.memoryLimit = '記憶體限制格式無效 (例如: 256Mi)';
    }

    // 資源限制邏輯驗證
    if (resources.requests && resources.limits) {
      const cpuReq = parseCPU(resources.requests.cpu);
      const cpuLim = parseCPU(resources.limits.cpu);
      if (cpuReq > cpuLim) {
        errors.cpu = 'CPU 請求不能大於限制';
      }

      const memReq = parseMemory(resources.requests.memory);
      const memLim = parseMemory(resources.limits.memory);
      if (memReq > memLim) {
        errors.memory = '記憶體請求不能大於限制';
      }
    }
  }

  // 存儲卷驗證
  if (config.volumes) {
    const volumeErrors = [];
    config.volumes.forEach((volume, index) => {
      const volumeError = {};
      if (!volume.name) {
        volumeError.name = '存儲卷名稱不能為空';
      }
      if (!volume.mountPath) {
        volumeError.mountPath = '掛載路徑不能為空';
      }
      if (volume.type !== 'emptyDir' && !volume.source) {
        volumeError.source = '存儲卷來源不能為空';
      }
      if (Object.keys(volumeError).length > 0) {
        volumeErrors[index] = volumeError;
      }
    });
    if (volumeErrors.length > 0) {
      errors.volumes = volumeErrors;
    }
  }

  // ConfigMap 驗證
  if (config.configMaps) {
    const configMapErrors = [];
    config.configMaps.forEach((cm, index) => {
      const cmError = {};
      if (!cm.name) {
        cmError.name = 'ConfigMap 名稱不能為空';
      }
      if (!cm.mountPath) {
        cmError.mountPath = '掛載路徑不能為空';
      }
      if (Object.keys(cm.data || {}).length === 0) {
        cmError.data = '至少需要一個配置項';
      }
      if (Object.keys(cmError).length > 0) {
        configMapErrors[index] = cmError;
      }
    });
    if (configMapErrors.length > 0) {
      errors.configMaps = configMapErrors;
    }
  }

  // Secret 驗證
  if (config.secrets) {
    const secretErrors = [];
    config.secrets.forEach((secret, index) => {
      const secretError = {};
      if (!secret.name) {
        secretError.name = 'Secret 名稱不能為空';
      }
      if (!secret.mountPath) {
        secretError.mountPath = '掛載路徑不能為空';
      }
      if (Object.keys(secret.data || {}).length === 0) {
        secretError.data = '至少需要一個配置項';
      }
      if (Object.keys(secretError).length > 0) {
        secretErrors[index] = secretError;
      }
    });
    if (secretErrors.length > 0) {
      errors.secrets = secretErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// 輔助函數：解析 CPU 值
const parseCPU = (cpu) => {
  if (cpu.endsWith('m')) {
    return parseInt(cpu.slice(0, -1)) / 1000;
  }
  return parseFloat(cpu);
};

// 輔助函數：解析記憶體值
const parseMemory = (memory) => {
  const units = {
    Ki: 1024,
    Mi: 1024 * 1024,
    Gi: 1024 * 1024 * 1024,
    Ti: 1024 * 1024 * 1024 * 1024
  };
  const match = memory.match(/^([0-9]+)([A-Za-z]+)?$/);
  if (!match) return 0;
  const value = parseInt(match[1]);
  const unit = match[2] || '';
  return value * (units[unit] || 1);
};

export const validateTemplate = (template) => {
  const errors = {};

  if (!template.name) {
    errors.name = '模板名稱不能為空';
  }

  if (!template.config) {
    errors.config = '模板配置不能為空';
  } else {
    const { isValid, errors: configErrors } = validatePodConfig(template.config);
    if (!isValid) {
      errors.config = configErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const migrateTemplate = (template) => {
  // 處理模板版本遷移
  const currentVersion = '1.0';
  const templateVersion = template.version || '1.0';

  if (templateVersion === currentVersion) {
    return template;
  }

  // 在這裡添加版本遷移邏輯
  let migratedTemplate = { ...template };

  // 示例：添加新的必需字段
  if (!migratedTemplate.config.image.pullPolicy) {
    migratedTemplate.config.image.pullPolicy = 'IfNotPresent';
  }

  migratedTemplate.version = currentVersion;
  return migratedTemplate;
};

export default validatePodConfig; 