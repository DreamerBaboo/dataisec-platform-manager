// 定義 API 錯誤類型
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// 定義請求配置類型
interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

// 獲取基礎 URL
const getBaseUrl = (): string => {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  console.log('API base URL:', apiBaseUrl);
  
  if (!apiBaseUrl) {
    console.warn('API base URL not found in environment variables');
    return import.meta.env.DEV 
      ? 'http://localhost:3001'
      : '';
  }
  
  return apiBaseUrl;
};

export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  // 移除開頭的斜線
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  const url = `${baseUrl}/${cleanEndpoint}`;
  console.log('Generated API URL:', url);
  return url;
};

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const token = localStorage.getItem('token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
}

export const api = {
  get: async <T>(endpoint: string): Promise<T> => {
    const url = getApiUrl(endpoint);
    console.log('Making GET request to:', url);
    
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
    console.log('Request headers:', headers);

    const response = await fetch(url, { headers });
    return handleResponse(response);
  },

  post: async <T>(endpoint: string, data: unknown): Promise<T> => {
    const response = await fetch(getApiUrl(endpoint), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  put: async <T>(endpoint: string, data: unknown): Promise<T> => {
    const response = await fetch(getApiUrl(endpoint), {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(getApiUrl(endpoint), {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(response);
  }
};

export default api; 