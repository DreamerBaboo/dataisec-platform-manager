export const getApiUrl = (endpoint: string): string => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? '/api'
    : 'http://localhost:3001/api';
  return `${baseUrl}/${endpoint}`.replace(/\/+/g, '/');
};

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(getApiUrl(endpoint), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },

  post: async (endpoint: string, data: any) => {
    const response = await fetch(getApiUrl(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },

  put: async (endpoint: string, data: any) => {
    const response = await fetch(getApiUrl(endpoint), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },

  delete: async (endpoint: string) => {
    const response = await fetch(getApiUrl(endpoint), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  }
}; 