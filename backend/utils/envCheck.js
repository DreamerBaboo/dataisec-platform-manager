const requiredEnvVars = [
  // Server Configuration
  'PORT',
  'NODE_ENV',

  // JWT Configuration
  'JWT_SECRET',
  'JWT_EXPIRES_IN',

  // OpenSearch Configuration
  'OPENSEARCH_HOST',
  'OPENSEARCH_PORT',
  'OPENSEARCH_USERNAME',
  'OPENSEARCH_PASSWORD',

  // OpenSearch Indices
  'OPENSEARCH_TEMPLATE_INDEX',
  'OPENSEARCH_DEPLOYMENT_LOG_INDEX',
  'OPENSEARCH_AUDIT_LOG_INDEX',

  // Kubernetes Configuration
  'KUBECONFIG',

  // Logging Configuration
  'LOG_LEVEL',
  'LOG_FORMAT',

  // WebSocket Configuration
  'WS_HEARTBEAT_INTERVAL'
];

const checkRequiredEnvVars = () => {
  const missingVars = [];
  const warnings = [];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // 特殊檢查
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'your-jwt-secret-key') {
      warnings.push('Default JWT_SECRET is being used in production');
    }
    
    if (!process.env.KUBECONFIG) {
      warnings.push('KUBECONFIG path is not set');
    }
  }

  // 檢查 OpenSearch 配置
  if (process.env.OPENSEARCH_USERNAME === 'admin' && process.env.OPENSEARCH_PASSWORD === 'admin') {
    warnings.push('Default OpenSearch credentials are being used');
  }

  // 輸出檢查結果
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`  - ${varName}`);
    });
  }

  if (warnings.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
  }

  if (missingVars.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables are properly configured');
    return true;
  }

  return missingVars.length === 0;
};

// 添加環境變量驗證函數
const validateEnvVar = (varName, validator) => {
  const value = process.env[varName];
  if (!value) return false;
  return validator(value);
};

// 常用的驗證器
const validators = {
  isPositiveNumber: (value) => !isNaN(value) && parseInt(value) > 0,
  isValidPort: (value) => !isNaN(value) && parseInt(value) >= 0 && parseInt(value) <= 65535,
  isValidUrl: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
};

module.exports = {
  checkRequiredEnvVars,
  validateEnvVar,
  validators
}; 