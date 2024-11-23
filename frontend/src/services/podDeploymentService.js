import axios from 'axios';
import { logger } from '../utils/logger.ts';


const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// 改進 API 請求配置
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  logger.info('🔐 Getting auth token:', token ? '有效' : '未找到');
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
      logger.info('📥 Getting versions for deployment:', name);
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
      
      logger.info('✅ Versions retrieved:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to get deployment versions:', error);
      throw error;
    }
  },

  // Get specific version configuration
  async getVersionConfig(name, version) {
    try {
      logger.info('📥 Getting version config:', { name, version });
      const config = getAuthHeaders();
      
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/config?version=${version}`,
        config
      );
      
      logger.info('✅ Version config retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get version config:', error);
      throw error;
    }
  },

  // Save deployment configuration with version
  async saveDeploymentConfig(name, version, config) {
    try {
      logger.info('💾 Saving deployment config:', { name, version, config });
      const headers = getAuthHeaders();
      
      // 檢查版本是否存在
      const existingVersions = await this.getDeploymentVersions(name);
      const isNewVersion = !existingVersions.versions.includes(version);
      
      if (isNewVersion) {
        logger.info('📝 Creating new version first...');
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
      
      logger.info('✅ Configuration saved successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to save deployment config:', error);
      throw error;
    }
  },

  // Create new version
  async createVersion(name, version) {
    try {
      logger.info('📝 Creating new version:', { name, version });
      const config = getAuthHeaders();
      
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions`,
        { version },
        config
      );
      
      logger.info('✅ Version created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create version:', error);
      throw error;
    }
  },

  // Handle namespace change
  async handleNamespaceChange(deploymentName, namespace) {
    try {
      logger.info('📝 Handling namespace change:', { deploymentName, namespace });
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/namespace`,
        { deploymentName, namespace },
        getAuthHeaders()
      );
      
      if (response.data.isNew) {
        logger.info('✨ Created new namespace configuration');
      } else {
        logger.info('ℹ️ Using existing namespace');
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
      logger.info('📥 Getting storage config:', { name, version });
      const config = getAuthHeaders();
      
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/storage?version=${version}`,
        config
      );
      
      logger.info('✅ Storage config retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get storage config:', error);
      throw error;
    }
  },

  // Save storage configuration
  async saveStorageConfig(name, version, storageConfig) {
    try {
      logger.info('💾 Saving storage config:', { name, version, storageConfig });
      const headers = getAuthHeaders();
      
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/storage`,
        storageConfig,
        headers
      );
      
      logger.info('✅ Storage configuration saved successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to save storage config:', error);
      throw error;
    }
  },

  // Create storage class
  async createStorageClass(name, version, storageClassConfig) {
    try {
      logger.info('📝 Creating storage class:', { name, version, storageClassConfig });
      const headers = getAuthHeaders();
      
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/storage-class`,
        storageClassConfig,
        headers
      );
      
      logger.info('✅ Storage class created:', response.data);
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
      logger.info('📝 Creating new namespace:', namespace);
      const headers = getAuthHeaders();
      
      const response = await axios.post(
        `${API_URL}/api/namespaces`,
        { namespace },
        headers
      );
      
      logger.info('✅ Namespace created successfully:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Failed to create namespace:', error);
      throw error;
    }
  },

  // Get nodes
  async getNodes() {
    try {
      logger.info('📥 Fetching nodes');
      const response = await axios.get(
        `${API_URL}/api/k8s/nodes`,
        getAuthHeaders()
      );
      logger.info('✅ Nodes fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch nodes:', error);
      throw error;
    }
  },

  // Get node details
  async getNodeDetails(nodeName) {
    try {
      logger.info('📥 Fetching node details:', nodeName);
      const response = await axios.get(
        `${API_URL}/api/k8s/nodes/${nodeName}`,
        getAuthHeaders()
      );
      logger.info('✅ Node details fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch node details:', error);
      throw error;
    }
  },

  // Delete storage configuration
  async deleteStorageConfig(name, version, type) {
    try {
      logger.info('🗑️ Deleting storage config:', { name, version, type });
      const response = await axios.delete(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/storage/${type}`,
        getAuthHeaders()
      );
      logger.info('✅ Storage configuration deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to delete storage config:', error);
      throw error;
    }
  },

  // Save deploy script
  async saveDeployScript(name, version, filename, content) {
    try {
      logger.info('💾 Saving deploy script:', { name, version, filename });
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/deploy-scripts`,
        { filename, content },
        getAuthHeaders()
      );
      logger.info('✅ Deploy script saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to save deploy script:', error);
      throw error;
    }
  },

  // Get ConfigMap configuration
  async getConfigMapConfig(name, version) {
    try {
      logger.info('📥 Getting ConfigMap config:', { name, version });
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/configmaps?version=${version}`,
        getAuthHeaders()
      );
      logger.info('✅ ConfigMap config retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get ConfigMap config:', error);
      throw error;
    }
  },

  // Save ConfigMap configuration
  async saveConfigMapConfig(name, version, configMapConfig) {
    try {
      logger.info('💾 Saving ConfigMap config:', { name, version, configMapConfig });
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/configmaps`,
        configMapConfig,
        getAuthHeaders()
      );
      logger.info('✅ ConfigMap config saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to save ConfigMap config:', error);
      throw error;
    }
  },

  // Delete deploy script
  async deleteDeployScript(name, version, filename) {
    try {
      logger.info('🗑️ Deleting deploy script:', { name, version, filename });
      const response = await axios.delete(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/deploy-scripts/${filename}`,
        getAuthHeaders()
      );
      logger.info('✅ Deploy script deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to delete deploy script:', error);
      throw error;
    }
  },

  // Get deploy script
  async getDeployScript(name, version, filename) {
    try {
      logger.info('📥 Getting deploy script:', { name, version, filename });
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/deploy-scripts/${filename}`,
        getAuthHeaders()
      );
      logger.info('✅ Deploy script retrieved:', response.data);
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
