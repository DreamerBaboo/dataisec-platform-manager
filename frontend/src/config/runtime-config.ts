/// <reference lib="dom" />
import { logger } from '../utils/logger';

interface RuntimeConfig {
  API_BASE_URL: string;
  WS_PORT: string;
  NODE_ENV: string;
  LOG_LEVEL: string;
}

// 擴展 Window 接口
declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

// 默認配置
const defaultConfig: RuntimeConfig = {
  API_BASE_URL: '',
  WS_PORT: '',
  NODE_ENV: 'production',
  LOG_LEVEL: 'info'
};

// 檢查是否在瀏覽器環境
const isBrowser = (): boolean => {
  return typeof globalThis !== 'undefined' && !!(globalThis as any).window;
};

// 安全地獲取 window 對象
const getWindow = (): Window | null => {
  return isBrowser() ? (globalThis as any).window : null;
};

// 驗證配置對象
const validateConfig = (config: unknown): config is RuntimeConfig => {
  if (!config || typeof config !== 'object') return false;
  const c = config as Partial<RuntimeConfig>;
  return typeof c.API_BASE_URL === 'string' &&
         typeof c.WS_PORT === 'string' &&
         typeof c.NODE_ENV === 'string' &&
         typeof c.LOG_LEVEL === 'string';
};

// 從運行時配置中獲取環境變量
export const getRuntimeConfig = (): RuntimeConfig => {
  try {
    // 優先使用運行時注入的配置
    const win = getWindow();
    if (win?.__RUNTIME_CONFIG__ && validateConfig(win.__RUNTIME_CONFIG__)) {
      logger.debug('使用運行時注入配置', win.__RUNTIME_CONFIG__);
      return win.__RUNTIME_CONFIG__;
    }

    // 如果在開發環境中，使用 Vite 的環境變量作為後備
    if (import.meta.env.DEV) {
      const config: RuntimeConfig = {
        API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
        WS_PORT: import.meta.env.VITE_WS_PORT || '',
        NODE_ENV: import.meta.env.NODE_ENV || 'development',
        LOG_LEVEL: import.meta.env.REACT_APP_LOG_LEVEL || 'info'
      };
      logger.debug('使用開發環境配置', config);
      return config;
    }

    // 使用默認配置作為最後的後備
    logger.debug('使用默認配置', defaultConfig);
    return { ...defaultConfig };
  } catch (error) {
    logger.error('獲取運行時配置時發生錯誤', error);
    return { ...defaultConfig };
  }
};

// 保存運行時配置
export const saveRuntimeConfig = (config: RuntimeConfig): void => {
  try {
    const win = getWindow();
    if (win) {
      win.__RUNTIME_CONFIG__ = { ...config };
      logger.info('成功保存運行時配置', config);
    } else {
      logger.warn('無法保存配置：不在瀏覽器環境中');
    }
  } catch (error) {
    logger.error('保存運行時配置時發生錯誤', error);
    throw error;
  }
};
