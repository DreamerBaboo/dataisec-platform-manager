// 錯誤類型定義
export const ERROR_TYPES = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  KUBERNETES: 'kubernetes',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
};

// 錯誤處理器
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, details = null) {
    super(message);
    this.type = type;
    this.details = details;
    this.timestamp = new Date();
  }
}

// 解析 API 錯誤
export const parseApiError = (error) => {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return new AppError(
          data.message || '請求參數無效',
          ERROR_TYPES.VALIDATION,
          data.errors
        );
      case 401:
        return new AppError(
          '未授權訪問',
          ERROR_TYPES.PERMISSION
        );
      case 403:
        return new AppError(
          '權限不足',
          ERROR_TYPES.PERMISSION
        );
      case 404:
        return new AppError(
          '資源不存在',
          ERROR_TYPES.KUBERNETES
        );
      case 409:
        return new AppError(
          '資源衝突',
          ERROR_TYPES.KUBERNETES,
          data.details
        );
      case 500:
        return new AppError(
          '服務器內部錯誤',
          ERROR_TYPES.UNKNOWN,
          data.error
        );
      default:
        return new AppError(
          '未知錯誤',
          ERROR_TYPES.UNKNOWN,
          data
        );
    }
  }

  if (error.request) {
    return new AppError(
      '網絡請求失敗',
      ERROR_TYPES.NETWORK
    );
  }

  return new AppError(
    error.message,
    ERROR_TYPES.UNKNOWN
  );
};

// 格式化錯誤消息
export const formatErrorMessage = (error) => {
  if (error instanceof AppError) {
    let message = error.message;
    
    if (error.details) {
      if (typeof error.details === 'string') {
        message += `\n${error.details}`;
      } else if (Array.isArray(error.details)) {
        message += `\n${error.details.join('\n')}`;
      } else if (typeof error.details === 'object') {
        message += '\n' + Object.entries(error.details)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
      }
    }
    
    return message;
  }
  
  return error.message || '未知錯誤';
};

// 記錄錯誤
export const logError = (error) => {
  console.error('Application Error:', {
    message: error.message,
    type: error.type,
    details: error.details,
    timestamp: error.timestamp,
    stack: error.stack
  });
}; 