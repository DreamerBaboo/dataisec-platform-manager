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
      throw error;
    }
  },

  // Create new version
  async createVersion(name, version) {
    try {
      console.log('📝 Creating new version:', { name, version });
      const config = getAuthHeaders();
      
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions`,
        { version },
        config
      );
      
      console.log('✅ Version created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create version:', error);
      throw error;
    }
  },

  // Handle namespace change
  async handleNamespaceChange(deploymentName, namespace) {
    try {
      console.log('📝 Handling namespace change:', { deploymentName, namespace });
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/namespace`,
        { deploymentName, namespace },
        getAuthHeaders()
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

  // Get namespaces
  async getNamespaces() {
    try {
      const response = await axios.get(
        `${API_URL}/api/k8s/namespaces`,
        getAuthHeaders()
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
      throw error;
    }
  },

  // Get storage configuration
  async getStorageConfig(name, version) {
    try {
      console.log('📥 Getting storage config:', { name, version });
      const config = getAuthHeaders();
      
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/storage?version=${version}`,
        config
      );
      
      console.log('✅ Storage config retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get storage config:', error);
      throw error;
    }
  },

  // Save storage configuration
  async saveStorageConfig(name, version, storageConfig) {
    try {
      console.log('💾 Saving storage config:', { name, version, storageConfig });
      const headers = getAuthHeaders();
      
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/storage`,
        storageConfig,
        headers
      );
      
      console.log('✅ Storage configuration saved successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to save storage config:', error);
      throw error;
    }
  },

  // Create storage class
  async createStorageClass(name, version, storageClassConfig) {
    try {
      console.log('📝 Creating storage class:', { name, version, storageClassConfig });
      const headers = getAuthHeaders();
      
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/storage-class`,
        storageClassConfig,
        headers
      );
      
      console.log('✅ Storage class created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create storage class:', error);
      throw error;
    }
  },

  // Get storage classes
  async getStorageClasses() {
    try {
      const response = await axios.get(
        `${API_URL}/api/k8s/storage-classes`,
        getAuthHeaders()
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch storage classes:', error);
      throw error;
    }
  },

  // Create new namespace
  async createNamespace(namespace) {
    try {
      console.log('📝 Creating new namespace:', namespace);
      const headers = getAuthHeaders();
      
      const response = await axios.post(
        `${API_URL}/api/k8s/namespaces`,
        { namespace },
        headers
      );
      
      console.log('✅ Namespace created successfully:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Failed to create namespace:', error);
      throw error;
    }
  },

  // Get nodes
  async getNodes() {
    try {
      console.log('📥 Fetching nodes');
      const response = await axios.get(
        `${API_URL}/api/k8s/nodes`,
        getAuthHeaders()
      );
      console.log('✅ Nodes fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch nodes:', error);
      throw error;
    }
  },

  // Get node details
  async getNodeDetails(nodeName) {
    try {
      console.log('📥 Fetching node details:', nodeName);
      const response = await axios.get(
        `${API_URL}/api/k8s/nodes/${nodeName}`,
        getAuthHeaders()
      );
      console.log('✅ Node details fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch node details:', error);
      throw error;
    }
  },

  // Delete storage configuration
  async deleteStorageConfig(name, version, type) {
    try {
      console.log('🗑️ Deleting storage config:', { name, version, type });
      const response = await axios.delete(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/storage/${type}`,
        getAuthHeaders()
      );
      console.log('✅ Storage configuration deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to delete storage config:', error);
      throw error;
    }
  },

  // Save deploy script
  async saveDeployScript(name, version, filename, content) {
    try {
      console.log('💾 Saving deploy script:', { name, version, filename });
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/deploy-scripts`,
        { filename, content },
        getAuthHeaders()
      );
      console.log('✅ Deploy script saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to save deploy script:', error);
      throw error;
    }
  },

  // Get ConfigMap configuration
  async getConfigMapConfig(name, version) {
    try {
      console.log('📥 Getting ConfigMap config:', { name, version });
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/configmaps?version=${version}`,
        getAuthHeaders()
      );
      console.log('✅ ConfigMap config retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get ConfigMap config:', error);
      throw error;
    }
  },

  // Save ConfigMap configuration
  async saveConfigMapConfig(name, version, configMapConfig) {
    try {
      console.log('💾 Saving ConfigMap config:', { name, version, configMapConfig });
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/configmaps`,
        configMapConfig,
        getAuthHeaders()
      );
      console.log('✅ ConfigMap config saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to save ConfigMap config:', error);
      throw error;
    }
  },

  // Delete deploy script
  async deleteDeployScript(name, version, filename) {
    try {
      console.log('🗑️ Deleting deploy script:', { name, version, filename });
      const response = await axios.delete(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/deploy-scripts/${filename}`,
        getAuthHeaders()
      );
      console.log('✅ Deploy script deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to delete deploy script:', error);
      throw error;
    }
  },

  // Get deploy script
  async getDeployScript(name, version, filename) {
    try {
      console.log('📥 Getting deploy script:', { name, version, filename });
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/deploy-scripts/${filename}`,
        getAuthHeaders()
      );
      console.log('✅ Deploy script retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get deploy script:', error);
      throw error;
    }
  },

  saveHelmDeployScript: async (name, version, filename, content) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/${version}/helm-scripts/${filename}`,
        { content }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to save helm deploy script:', error);
      throw error;
    }
  },
};

export default podDeploymentService;
