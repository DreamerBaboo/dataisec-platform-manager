// 配置版本定義
const CONFIG_VERSIONS = {
  '1.0': {
    features: ['basic', 'resources', 'affinity', 'volumes'],
    requiredFields: ['name', 'namespace', 'type', 'image']
  },
  '1.1': {
    features: ['basic', 'resources', 'affinity', 'volumes', 'configMaps', 'secrets'],
    requiredFields: ['name', 'namespace', 'type', 'image', 'resources']
  },
  '1.2': {
    features: ['basic', 'resources', 'affinity', 'volumes', 'configMaps', 'secrets', 'probes'],
    requiredFields: ['name', 'namespace', 'type', 'image', 'resources']
  }
};

// 獲取最新版本
export const getLatestVersion = () => {
  return Object.keys(CONFIG_VERSIONS).sort().pop();
};

// 檢查配置版本
export const checkConfigVersion = (config) => {
  const version = config.version || '1.0';
  if (!CONFIG_VERSIONS[version]) {
    throw new Error(`Unsupported configuration version: ${version}`);
  }
  return version;
};

// 遷移配置到最新版本
export const migrateConfig = (config) => {
  const currentVersion = checkConfigVersion(config);
  const latestVersion = getLatestVersion();

  if (currentVersion === latestVersion) {
    return config;
  }

  let migratedConfig = { ...config };
  const versions = Object.keys(CONFIG_VERSIONS).sort();
  const startIndex = versions.indexOf(currentVersion);

  // 逐步遷移到每個新版本
  for (let i = startIndex + 1; i < versions.length; i++) {
    migratedConfig = migrateToVersion(migratedConfig, versions[i]);
  }

  return migratedConfig;
};

// 遷移到特定版本
const migrateToVersion = (config, targetVersion) => {
  switch (targetVersion) {
    case '1.1':
      return migrateTo1_1(config);
    case '1.2':
      return migrateTo1_2(config);
    default:
      throw new Error(`Unknown version: ${targetVersion}`);
  }
};

// 遷移到 1.1 版本
const migrateTo1_1 = (config) => {
  return {
    ...config,
    version: '1.1',
    configMaps: config.configMaps || [],
    secrets: config.secrets || [],
    resources: {
      requests: {
        cpu: config.resources?.requests?.cpu || '100m',
        memory: config.resources?.requests?.memory || '128Mi'
      },
      limits: {
        cpu: config.resources?.limits?.cpu || '200m',
        memory: config.resources?.limits?.memory || '256Mi'
      }
    }
  };
};

// 遷移到 1.2 版本
const migrateTo1_2 = (config) => {
  return {
    ...config,
    version: '1.2',
    probes: {
      livenessProbe: config.probes?.livenessProbe || {
        httpGet: {
          path: '/health',
          port: 8080
        },
        initialDelaySeconds: 30,
        periodSeconds: 10
      },
      readinessProbe: config.probes?.readinessProbe || {
        httpGet: {
          path: '/ready',
          port: 8080
        },
        initialDelaySeconds: 15,
        periodSeconds: 5
      }
    }
  };
};

// 驗證配置是否符合版本要求
export const validateConfigVersion = (config) => {
  const version = checkConfigVersion(config);
  const versionSpec = CONFIG_VERSIONS[version];
  const errors = [];

  // 檢查必需字段
  for (const field of versionSpec.requiredFields) {
    if (!config[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // 檢查特性支持
  for (const feature of Object.keys(config)) {
    if (!versionSpec.features.includes(feature)) {
      errors.push(`Feature not supported in version ${version}: ${feature}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// 創建新的配置
export const createNewConfig = (version = getLatestVersion()) => {
  if (!CONFIG_VERSIONS[version]) {
    throw new Error(`Invalid version: ${version}`);
  }

  return {
    version,
    name: '',
    namespace: 'default',
    type: 'deployment',
    replicas: 1,
    image: {
      repository: '',
      tag: 'latest',
      pullPolicy: 'IfNotPresent'
    },
    resources: {
      requests: {
        cpu: '100m',
        memory: '128Mi'
      },
      limits: {
        cpu: '200m',
        memory: '256Mi'
      }
    },
    affinity: {
      nodeAffinity: null,
      podAffinity: null,
      podAntiAffinity: null
    },
    volumes: [],
    configMaps: [],
    secrets: [],
    probes: {
      livenessProbe: {
        httpGet: {
          path: '/health',
          port: 8080
        },
        initialDelaySeconds: 30,
        periodSeconds: 10
      },
      readinessProbe: {
        httpGet: {
          path: '/ready',
          port: 8080
        },
        initialDelaySeconds: 15,
        periodSeconds: 5
      }
    }
  };
}; 