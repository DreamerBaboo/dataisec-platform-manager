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

  // Create host directory for persistent volume
  async createHostDirectory(nodeName, path, options = {}) {
    try {
      if (!nodeName?.trim()) {
        throw new Error('Node name is required');
      }
      if (!path?.trim()) {
        throw new Error('Directory path is required');
      }

      const sanitizedPath = this.sanitizePath(path);

      logger.info('📁 Creating host directory:', { 
        nodeName, 
        path: sanitizedPath,
        options 
      });

      const response = await axios.post(
        `${API_URL}/api/k8s/nodes/${nodeName}/directories`,
        {
          path: sanitizedPath,
          mode: options.mode || '0755',
          recursive: options.recursive !== false,
        },
        getAuthHeaders()
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to create directory');
      }

      return response.data;
    } catch (error) {
      logger.error('❌ Failed to create host directory:', {
        error,
        nodeName,
        path,
        details: error.response?.data
      });

      const errorMessage = error.response?.data?.message || error.message;
      const isRegistryError = errorMessage.includes('local registry');

      if (isRegistryError) {
        throw new Error('無法從本地倉庫拉取映像。請確保本地倉庫中有所需的 busybox 映像。');
      }

      throw {
        success: false,
        message: this.getDirectoryErrorMessage(error),
        path,
        node: nodeName
      };
    }
  },

  // 輔助方法：路徑清理
  sanitizePath(path) {
    // 移除多餘的斜線
    let sanitized = path.replace(/\/+/g, '/');
    
    // 確保以斜線開始
    if (!sanitized.startsWith('/')) {
      sanitized = '/' + sanitized;
    }
    
    // 移除結尾斜線（除非是根目錄）
    if (sanitized.length > 1 && sanitized.endsWith('/')) {
      sanitized = sanitized.slice(0, -1);
    }
    
    // 檢查非法字符
    const invalidChars = /[<>:"|?*\x00-\x1F]/g;
    if (invalidChars.test(sanitized)) {
      throw new Error('Path contains invalid characters');
    }
    
    // 防止目錄遍歷
    if (sanitized.includes('..')) {
      throw new Error('Directory traversal is not allowed');
    }
    
    return sanitized;
  },

  // 輔助方法：錯誤信息處理
  getDirectoryErrorMessage(error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message;

      switch (status) {
        case 400:
          return `Invalid request: ${message || 'Bad parameters'}`;
        case 403:
          return `Permission denied: ${message || 'Insufficient privileges'}`;
        case 404:
          return `Not found: ${message || 'Node or path not found'}`;
        case 409:
          return `Conflict: ${message || 'Directory already exists'}`;
        case 500:
          return `Server error: ${message || 'Internal server error'}`;
        default:
          return message || `HTTP error ${status}`;
      }
    }

    if (error.request) {
      return 'Network error: Unable to reach the server';
    }

    return error.message || 'Unknown error occurred';
  },

  // // 添加創建目錄的方法
  // async createDirectory(directoryData) {
  //   const response = await axios.post('/api/pod-deployment/create-directory', directoryData);
  //   return response.data;
  // }

  // 在 podDeploymentService 中添加新方法
  async saveQuotaConfig(name, version, quotaConfig, namespace) {
    try {
      logger.info('💾 Saving quota config:', { name, version, quotaConfig, namespace });
      
      // 保存到 config.json
      const configResponse = await this.saveDeploymentConfig(name, version, {
        resourceQuota: quotaConfig,
        enableResourceQuota: true,
        namespace: namespace
      });

      // 生成並保存 quota YAML
      const yamlResponse = await axios.post(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/quota`,
        { 
          quotaConfig,
          namespace: namespace || 'default'
        },
        getAuthHeaders()
      );

      logger.info('✅ Quota configuration saved successfully');
      return {
        config: configResponse,
        yaml: yamlResponse.data
      };
    } catch (error) {
      logger.error('❌ Failed to save quota config:', error);
      throw error;
    }
  },

  // 修改刪除配額文件的方法
  async deleteQuotaConfig(name, version) {
    try {
      logger.info('🗑️ Deleting quota config:', { name, version });
      
      // 從 deploy-scripts 目錄刪除文件
      const response = await axios.delete(
        `${API_URL}/api/pod-deployments/${name}/versions/${version}/quota`,
        getAuthHeaders()
      );
      
      // 更新 config.json 中的配置
      await this.saveDeploymentConfig(name, version, {
        resourceQuota: null,
        enableResourceQuota: false
      });
      
      logger.info('✅ Quota configuration deleted successfully');
      return response.data;
    } catch (error) {
      logger.error('❌ Failed to delete quota config:', error);
      throw error;
    }
  }
};

export default podDeploymentService;
