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
    RUNTIME_CONFIG?: RuntimeConfig;
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
    // 如果在開發環境中，使用 Vite 的環境變量
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

    // 在生產環境中，使用運行時注入的配置
    const win = getWindow();
    if (win?.RUNTIME_CONFIG && validateConfig(win.RUNTIME_CONFIG)) {
      logger.debug('使用運行時注入配置', win.RUNTIME_CONFIG);
      return win.RUNTIME_CONFIG;
    }

    // 使用默認配置
    logger.debug('使用默認配置', defaultConfig);
    return { ...defaultConfig };
  } catch (error) {
    logger.info('獲取運行時配置時發生錯誤', error);
    throw error;
  }
};

// 保存運行時配置
export const saveRuntimeConfig = (config: RuntimeConfig): void => {
  try {
    const win = getWindow();
    if (win) {
      win.RUNTIME_CONFIG = { ...config };
      logger.info('成功保存運行時配置', config);
    } else {
      logger.warn('無法保存配置：不在瀏覽器環境中');
    }
  } catch (error) {
    logger.info('保存運行時配置時發生錯誤', error);
    throw error;
  }
};
