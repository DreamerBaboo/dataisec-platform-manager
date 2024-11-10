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
      
      // 確保返回格式一致
      const data = {
        versions: Array.isArray(response.data.versions) ? response.data.versions : [],
        latestVersion: response.data.latestVersion || null
      };
      
      console.log('✅ Versions retrieved:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to get deployment versions:', error);
      throw error;
    }
  },

  // Get specific version configuration
  async getVersionConfig(name, version) {
    try {
      console.log('📥 Getting version config:', { name, version });
      const config = getAuthHeaders();
      
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/config?version=${version}`,
        config
      );
      
      console.log('✅ Version config retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get version config:', error);
      throw error;
    }
  },

  // Save deployment configuration with version
  async saveDeploymentConfig(name, version, config) {
    try {
      console.log('💾 Saving deployment config:', { name, version, config });
      const headers = getAuthHeaders();
      
      // 檢查版本是否存在
      const existingVersions = await this.getDeploymentVersions(name);
      const isNewVersion = !existingVersions.versions.includes(version);
      
      if (isNewVersion) {
        console.log('📝 Creating new version first...');
        try {
          await this.createVersion(name, version);
        } catch (error) {
          console.error('❌ Failed to create version:', error);
          if (error.response?.status !== 409) {
            throw error;
          }
        }
      }
      
      // 使用正確的 API 端點
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/config`,
        { config },
        headers
      );
      
      console.log('✅ Configuration saved successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to save deployment config:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
        url: error.config?.url
      });
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
  },

  async handleNamespaceChange(deploymentName, namespace) {
    try {
      console.log('📝 Handling namespace change:', { deploymentName, namespace });
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/namespace`,
        { deploymentName, namespace },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (response.data.isNew) {
        console.log('✨ Created new namespace configuration');
      } else {
        console.log('ℹ️ Using existing namespace');
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to handle namespace change:', error);
      throw error;
    }
  },

  // 創建新版本
  async createVersion(deploymentName, version) {
    try {
      console.log('📝 Creating new version:', { deploymentName, version });
      const config = getAuthHeaders();
      
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${deploymentName}/versions`,
        { version },
        config
      );
      
      console.log('✅ Version created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create version:', error);
      throw error;
    }
  }
};

export default podDeploymentService;
