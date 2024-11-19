// 定義 API 錯誤類型
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// 定義請求配置類型
interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

// 定義 API 配置介面
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
}

// 獲取 API 配置
function getApiConfig(): ApiConfig {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
  
  const isInCluster = window.location.hostname.includes('.cluster.local');
  
  return {
    baseUrl: apiUrl.replace(/\/+$/, ''), // 移除結尾的斜線
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(isInCluster ? { 'X-Cluster-Client': 'true' } : {})
    }
  };
}

// API 請求基礎配置
const defaultOptions: RequestOptions = {
  credentials: 'include', // 包含認證資訊
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// 獲取基礎 URL
export const getBaseUrl = (): string => {
  const config = getApiConfig();
  return config.baseUrl;
};

// 獲取完整 API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const url = `${baseUrl}/${cleanEndpoint}`;
  console.log('Generated API URL:', url);
  return url;
};

// 發送請求的函數
export async function fetchApi(endpoint: string, options: RequestOptions = {}) {
  const url = getApiUrl(endpoint);
  console.log('Requesting URL:', url);
  
  const fetchOptions: RequestOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...getApiConfig().headers,
      ...options.headers,
      Authorization: `Bearer ${localStorage.getItem('token') || ''}`
    }
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), getApiConfig().timeout);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return handleResponse(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout');
      }
      console.error(`API Request Failed: ${endpoint}`, error);
      throw new ApiError(0, error.message);
    }
    throw error;
  }
}

async function handleResponse(response: Response) {
  console.log('Response details:', {
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Error response body:', text);
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Invalid content type:', contentType);
    console.error('Response body:', text);
    throw new ApiError(415, 'Response is not JSON');
  }

  return response.json();
}

function getHeaders(): Record<string, string> {
  const config = getApiConfig();
  const headers = { ...config.headers };
  
  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
}

export const api = {
  get: async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
    return fetchApi(endpoint, {
      ...options,
      method: 'GET'
    });
  },

  post: async <T>(endpoint: string, data: unknown, options: RequestOptions = {}): Promise<T> => {
    return fetchApi(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  put: async <T>(endpoint: string, data: unknown, options: RequestOptions = {}): Promise<T> => {
    return fetchApi(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  delete: async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
    return fetchApi(endpoint, {
      ...options,
      method: 'DELETE'
    });
  },

  // 用於檢查 API 狀態
  health: async () => {
    try {
      const response = await api.get<{ status: string }>('health');
      return response.status === 'ok';
    } catch {
      return false;
    }
  }
};

export default api; 