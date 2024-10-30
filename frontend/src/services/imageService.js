import axios from 'axios';

const API_BASE_URL = '/api';

export const imageService = {
  // 獲取鏡像列表
  getImages: (params) => 
    axios.get(`${API_BASE_URL}/images`, { params }),

  // 獲取鏡像詳情
  getImageDetail: (name) => 
    axios.get(`${API_BASE_URL}/images/${name}`),

  // 刪除鏡像
  deleteImage: (name) => 
    axios.delete(`${API_BASE_URL}/images/${name}`),

  // 拉取鏡像
  pullImage: (name, tag) => 
    axios.post(`${API_BASE_URL}/images/pull`, { name, tag }),

  // 推送鏡像
  pushImage: (name, tag) => 
    axios.post(`${API_BASE_URL}/images/push`, { name, tag }),

  // 標記鏡像
  tagImage: (name, newTag) => 
    axios.post(`${API_BASE_URL}/images/tag`, { name, newTag }),

  // Registry 配置管理
  getRegistryConfig: () =>
    axios.get(`${API_BASE_URL}/images/registry/config`),

  updateRegistryConfig: (config) =>
    axios.put(`${API_BASE_URL}/images/registry/config`, config),

  // Registry 健康檢查
  checkRegistryHealth: () =>
    axios.get(`${API_BASE_URL}/images/registry/health`)
}; 