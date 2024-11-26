import { getRuntimeConfig } from './runtime-config.ts';

const { API_BASE_URL } = getRuntimeConfig();

export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export default {
  API_BASE_URL,
  getApiUrl
};
