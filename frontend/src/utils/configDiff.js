import { diff } from 'deep-object-diff';

// 格式化差異結果
const formatDiff = (diffResult, path = '') => {
  const changes = [];

  for (const [key, value] of Object.entries(diffResult)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (value && typeof value === 'object') {
      changes.push(...formatDiff(value, currentPath));
    } else {
      changes.push({
        path: currentPath,
        value
      });
    }
  }

  return changes;
};

// 比較兩個配置
export const compareConfigs = (oldConfig, newConfig) => {
  const differences = diff(oldConfig, newConfig);
  return formatDiff(differences);
};

// 生成差異報告
export const generateDiffReport = (oldConfig, newConfig) => {
  const changes = compareConfigs(oldConfig, newConfig);
  
  return {
    changes,
    summary: {
      total: changes.length,
      paths: changes.map(c => c.path)
    }
  };
};

// 檢查是否有重大變更
export const hasMajorChanges = (oldConfig, newConfig) => {
  const majorFields = [
    'type',
    'namespace',
    'resources.limits',
    'volumes',
    'configMaps',
    'secrets'
  ];

  const changes = compareConfigs(oldConfig, newConfig);
  return changes.some(change => 
    majorFields.some(field => change.path.startsWith(field))
  );
}; 