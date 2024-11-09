import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// 改進 API 請求配置
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  console.log('🔐 Getting auth token:', token ? '有效' : '未找到');
  return {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  };
};

export const podDeploymentService = {
  // Get deployment versions
  async getDeploymentVersions(name) {
    try {
      console.log('📥 Getting versions for deployment:', name);
      const config = getAuthHeaders();
      
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/versions`,
        config
      );
      
      console.log('✅ Versions retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get deployment versions:', {
        name,
        error: error.message,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Get specific version configuration
  async getVersionConfig(name, version) {
    try {
      console.log(`📥 Requesting config for ${name} version ${version}`);
      const config = getAuthHeaders();
      
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/config`,
        config
      );
      
      // 驗證回應格式
      if (!response.data?.config) {
        console.warn('⚠️ Invalid response format:', response.data);
        throw new Error('Invalid config format in response');
      }
      
      console.log('✅ Successfully got version config:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get version config:', {
        name,
        version,
        error: error.message,
        response: error.response?.data
      });
      throw error;
    }
  },

  // Save deployment configuration with version
  async saveDeploymentConfig(name, version, config) {
    try {
      console.log('Saving deployment config:', { name, version, config });
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/config`,
        {
          name,
          version,
          config
        },
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Configuration saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to save deployment config:', error);
      throw error;
    }
  },

  // Check if deployment exists
  async checkDeploymentExists(name) {
    try {
      console.log('Checking if deployment exists:', name);
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/exists`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      console.log('Deployment exists check:', response.data);
      return response.data.exists;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false;
      }
      console.error('Failed to check deployment existence:', error);
      throw error;
    }
  },

  // Get deployment list
  async getDeployments() {
    try {
      const response = await axios.get(
        `${API_URL}/api/pod-deployments`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get deployments:', error);
      throw error;
    }
  },

  // Create new deployment
  async createDeployment(deploymentConfig) {
    try {
      const response = await axios.post(
        `${API_URL}/api/pod-deployments`,
        deploymentConfig,
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create deployment:', error);
      throw error;
    }
  },

  // Get deployment preview
  async getDeploymentPreview(config) {
    try {
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/preview`,
        config,
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get deployment preview:', error);
      throw error;
    }
  },

  // Get deployment status
  async getDeploymentStatus(name, namespace) {
    try {
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/status`,
        {
          params: { namespace },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get deployment status:', error);
      throw error;
    }
  },

  // Get deployment logs
  async getDeploymentLogs(name, namespace, options = {}) {
    try {
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/logs`,
        {
          params: { 
            name,
            namespace,
            ...options
          },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get deployment logs:', error);
      throw error;
    }
  },

  // Save storage configuration
  async saveStorageConfig(name, version, storageConfig) {
    try {
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/templates/${name}/storage`,
        {
          version,
          storageClassYaml: storageConfig.storageClassYaml,
          persistentVolumeYaml: storageConfig.persistentVolumeYaml
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to save storage config:', error);
      throw error;
    }
  },

  // Get storage configuration
  async getStorageConfig(name, version) {
    try {
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/templates/${name}/storage/${version}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get storage config:', error);
      throw error;
    }
  },

  // Get namespaces
  async getNamespaces() {
    try {
      const response = await axios.get(
        `${API_URL}/api/k8s/namespaces`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
      throw error;
    }
  }
};

export default podDeploymentService;
