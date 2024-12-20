const k8s = require('@kubernetes/client-node');
const yaml = require('js-yaml');
const k8sConfig = require('../config/k8s.config');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const path = require('path');
const fs = require('fs/promises');
const YAML = require('yaml');

class K8sService {
  constructor() {
    this.kc = new k8s.KubeConfig();
       
    // 如果在 Kubernetes 集群內運行，使用 ServiceAccount 憑證
    if (process.env.KUBERNETES_SERVICE_HOST) {
      this.kc.loadFromCluster();
    } else {
      // 如果在集群外運行，嘗試加載默認配置
      this.kc.loadFromDefault();
    }
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sAppsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.storageApi = this.kc.makeApiClient(k8s.StorageV1Api);
  }

  // Pod 相關操作
  async listPods(namespace, labelSelector) {
    try {
      const response = await this.k8sApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector);
      return response.body;
    } catch (error) {
      console.error('Failed to list pods:', error);
      throw error;
    }
  }

  async createPod(namespace, podManifest) {
    try {
      const response = await this.k8sApi.createNamespacedPod(namespace, podManifest);
      return response.body;
    } catch (error) {
      console.error('Failed to create pod:', error);
      throw error;
    }
  }

  async deletePod(namespace, name) {
    try {
      const response = await this.k8sApi.deleteNamespacedPod(name, namespace);
      return response.body;
    } catch (error) {
      console.error('Failed to delete pod:', error);
      throw error;
    }
  }

  async getPod(namespace, name) {
    try {
      const response = await this.k8sApi.readNamespacedPod(name, namespace);
      return response.body;
    } catch (error) {
      console.error('Failed to get pod:', error);
      throw error;
    }
  }

  async execInPod(namespace, podName, containerName, command) {
    try {
      const exec = new k8s.Exec(this.kc);
      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        exec.exec(
          namespace,
          podName,
          containerName,
          command,
          process.stdout,
          process.stderr,
          process.stdin,
          true,
          (status) => {
            if (status.status === 'Success') {
              resolve({ stdout, stderr });
            } else {
              reject(new Error(`Command failed with status: ${status.status}`));
            }
          }
        );
      });
    } catch (error) {
      console.error('Failed to exec in pod:', error);
      throw error;
    }
  }

  // 生成部署預覽
  generateDeploymentPreview(config) {
    const deployment = {
      apiVersion: 'apps/v1',
      kind: config.type.charAt(0).toUpperCase() + config.type.slice(1),
      metadata: {
        name: config.name,
        namespace: config.namespace
      },
      spec: {
        replicas: config.type === 'daemonset' ? undefined : config.replicas,
        selector: {
          matchLabels: {
            app: config.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: config.name
            }
          },
          spec: {
            containers: [{
              name: config.name,
              image: `${config.image.repository}:${config.image.tag}`,
              imagePullPolicy: config.image.pullPolicy,
              resources: config.resources
            }]
          }
        }
      }
    };

    // 添加親和性配置
    if (config.affinity.nodeAffinity || config.affinity.podAffinity || config.affinity.podAntiAffinity) {
      deployment.spec.template.spec.affinity = {};
      
      if (config.affinity.nodeAffinity) {
        deployment.spec.template.spec.affinity.nodeAffinity = yaml.load(config.affinity.nodeAffinity);
      }
      if (config.affinity.podAffinity) {
        deployment.spec.template.spec.affinity.podAffinity = yaml.load(config.affinity.podAffinity);
      }
      if (config.affinity.podAntiAffinity) {
        deployment.spec.template.spec.affinity.podAntiAffinity = yaml.load(config.affinity.podAntiAffinity);
      }
    }

    // 添加存儲卷配置
    if (config.volumes && config.volumes.length > 0) {
      deployment.spec.template.spec.volumes = config.volumes.map(vol => {
        const volume = { name: vol.name };
        switch (vol.type) {
          case 'emptyDir':
            volume.emptyDir = {};
            break;
          case 'hostPath':
            volume.hostPath = { path: vol.source };
            break;
          case 'persistentVolumeClaim':
            volume.persistentVolumeClaim = { claimName: vol.source };
            break;
        }
        return volume;
      });

      deployment.spec.template.spec.containers[0].volumeMounts = config.volumes.map(vol => ({
        name: vol.name,
        mountPath: vol.mountPath
      }));
    }

    // 添加 ConfigMap 配置
    if (config.configMaps && config.configMaps.length > 0) {
      const configMapVolumes = config.configMaps.map(cm => ({
        name: `configmap-${cm.name}`,
        configMap: { name: cm.name }
      }));

      const configMapMounts = config.configMaps.map(cm => ({
        name: `configmap-${cm.name}`,
        mountPath: cm.mountPath
      }));

      deployment.spec.template.spec.volumes = [
        ...(deployment.spec.template.spec.volumes || []),
        ...configMapVolumes
      ];

      deployment.spec.template.spec.containers[0].volumeMounts = [
        ...(deployment.spec.template.spec.containers[0].volumeMounts || []),
        ...configMapMounts
      ];
    }

    // 添加 Secret 配置
    if (config.secrets && config.secrets.length > 0) {
      const secretVolumes = config.secrets.map(secret => ({
        name: `secret-${secret.name}`,
        secret: { secretName: secret.name }
      }));

      const secretMounts = config.secrets.map(secret => ({
        name: `secret-${secret.name}`,
        mountPath: secret.mountPath
      }));

      deployment.spec.template.spec.volumes = [
        ...(deployment.spec.template.spec.volumes || []),
        ...secretVolumes
      ];

      deployment.spec.template.spec.containers[0].volumeMounts = [
        ...(deployment.spec.template.spec.containers[0].volumeMounts || []),
        ...secretMounts
      ];
    }

    return {
      deployment,
      yaml: yaml.dump(deployment)
    };
  }

  // 創建 ConfigMap
  async createConfigMap(namespace, name, data) {
    const configMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name,
        namespace
      },
      data
    };

    return await this.k8sApi.createNamespacedConfigMap(namespace, configMap);
  }

  // 創建 Secret
  async createSecret(namespace, name, data) {
    // 將數據轉換為 base64
    const encodedData = {};
    for (const [key, value] of Object.entries(data)) {
      encodedData[key] = Buffer.from(value).toString('base64');
    }

    const secret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name,
        namespace
      },
      type: 'Opaque',
      data: encodedData
    };

    return await this.k8sApi.createNamespacedSecret(namespace, secret);
  }

  // 創建部署
  async createDeployment(config) {
    // 首先創建所需的 ConfigMaps
    if (config.configMaps) {
      for (const cm of config.configMaps) {
        await this.createConfigMap(config.namespace, cm.name, cm.data);
      }
    }

    // 創建所需的 Secrets
    if (config.secrets) {
      for (const secret of config.secrets) {
        await this.createSecret(config.namespace, secret.name, secret.data);
      }
    }

    // 生成部署配置
    const { deployment } = this.generateDeploymentPreview(config);

    // 根據部署類型選擇適當的 API
    switch (config.type.toLowerCase()) {
      case 'deployment':
        return await this.k8sAppsApi.createNamespacedDeployment(
          config.namespace,
          deployment
        );
      case 'statefulset':
        return await this.k8sAppsApi.createNamespacedStatefulSet(
          config.namespace,
          deployment
        );
      case 'daemonset':
        return await this.k8sAppsApi.createNamespacedDaemonSet(
          config.namespace,
          deployment
        );
      default:
        throw new Error(`Unsupported deployment type: ${config.type}`);
    }
  }

  async listDeployments(namespace = 'default') {
    try {
      const response = await this.k8sAppsApi.listNamespacedDeployment(namespace);
      return response.body;
    } catch (error) {
      throw new Error(`Failed to list deployments: ${error.message}`);
    }
  }

  async getDeployment(name, namespace = 'default') {
    try {
      const response = await this.k8sAppsApi.readNamespacedDeployment(
        name,
        namespace
      );
      return response.body;
    } catch (error) {
      throw new Error(`Failed to get deployment: ${error.message}`);
    }
  }

  async deleteDeployment(name, namespace = 'default') {
    try {
      const response = await this.k8sAppsApi.deleteNamespacedDeployment(
        name,
        namespace
      );
      return response.body;
    } catch (error) {
      throw new Error(`Failed to delete deployment: ${error.message}`);
    }
  }

  // 獲取 Pod 日誌
  async getPodLogs(name, namespace = 'default', options = {}) {
    try {
      const { container, tailLines = 100, follow = false } = options;
      const logOptions = {
        follow,
        tailLines,
        ...(container && { container })
      };

      const response = await this.k8sApi.readNamespacedPodLog(
        name,
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        logOptions
      );

      return response.body;
    } catch (error) {
      throw new Error(`Failed to get pod logs: ${error.message}`);
    }
  }

  // 獲取 Pod 的容器列表
  async getPodContainers(name, namespace = 'default') {
    try {
      const response = await this.k8sApi.readNamespacedPod(name, namespace);
      return response.body.spec.containers.map(container => container.name);
    } catch (error) {
      throw new Error(`Failed to get pod containers: ${error.message}`);
    }
  }

  // 獲取部署狀態
  async getDeploymentStatus(name, namespace = 'default') {
    try {
      const response = await this.k8sAppsApi.readNamespacedDeploymentStatus(
        name,
        namespace
      );
      return response.body.status;
    } catch (error) {
      throw new Error(`Failed to get deployment status: ${error.message}`);
    }
  }

  // 監控部署進度
  async watchDeployment(name, namespace = 'default', callback) {
    const watch = new k8s.Watch(this.kc);
    
    return watch.watch(
      `/apis/apps/v1/namespaces/${namespace}/deployments`,
      {},
      (type, apiObj) => {
        if (apiObj.metadata.name === name) {
          callback(type, apiObj);
        }
      },
      (err) => {
        if (err) {
          console.error(`Watch error: ${err}`);
        }
      }
    );
  }

  async getNodes() {
    try {
      const { body } = await this.k8sApi.listNode();
      return body.items.map(node => ({
        name: node.metadata.name,
        status: node.status.conditions.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
        roles: Object.keys(node.metadata.labels)
          .filter(label => label.startsWith('node-role.kubernetes.io/'))
          .map(label => label.replace('node-role.kubernetes.io/', '')),
        version: node.status.nodeInfo.kubeletVersion,
        internalIP: node.status.addresses.find(addr => addr.type === 'InternalIP')?.address,
        hostname: node.status.addresses.find(addr => addr.type === 'Hostname')?.address
      }));
    } catch (error) {
      console.error('Failed to get nodes:', error);
      throw error;
    }
  }

  // Get node details
  async getNodeDetails(nodeName) {
    try {
      const { body } = await this.k8sApi.readNode(nodeName);
      return {
        name: body.metadata.name,
        status: body.status.conditions.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
        roles: Object.keys(body.metadata.labels)
          .filter(label => label.startsWith('node-role.kubernetes.io/'))
          .map(label => label.replace('node-role.kubernetes.io/', '')),
        version: body.status.nodeInfo.kubeletVersion,
        internalIP: body.status.addresses.find(addr => addr.type === 'InternalIP')?.address,
        hostname: body.status.addresses.find(addr => addr.type === 'Hostname')?.address,
        capacity: body.status.capacity,
        allocatable: body.status.allocatable,
        conditions: body.status.conditions,
        nodeInfo: body.status.nodeInfo
      };
    } catch (error) {
      console.error('Failed to get node details:', error);
      throw error;
    }
  }

  // Storage Class 相關方法
  async createStorageClass(yaml) {
    try {
      console.log('Creating StorageClass from YAML');
      const storageClassObj = YAML.parse(yaml);
      
      const response = await this.storageApi.createStorageClass(storageClassObj);
      console.log('StorageClass created successfully');
      
      return response.body;
    } catch (error) {
      console.error('Failed to create StorageClass:', error);
      throw error;
    }
  }

  // 保存 StorageClass YAML
  async saveStorageClassYaml(name, version, yaml) {
    try {
      console.log('Saving StorageClass YAML');
      const deploymentDir = path.join(__dirname, '../deploymentTemplate', name);
      const deployScriptsDir = path.join(deploymentDir, 'deploy-scripts');
      
      // Ensure directory exists
      await fs.mkdir(deployScriptsDir, { recursive: true });
      
      // Save YAML file in deploy-scripts folder
      const filePath = path.join(deployScriptsDir, `${name}-${version}-storageClass.yaml`);
      await fs.writeFile(filePath, yaml);
      
      console.log('StorageClass YAML saved to:', filePath);
      return filePath;
    } catch (error) {
      console.error('Failed to save StorageClass YAML:', error);
      throw error;
    }
  }

  // 獲取 StorageClass YAML
  async getStorageClassYaml(name, version) {
    try {
      console.log('Getting StorageClass YAML');
      const filePath = path.join(
        __dirname,
        '../deploymentTemplate',
        name,
        'deploy-scripts',
        `${name}-${version}-storageClass.yaml`
      );
      
      const yaml = await fs.readFile(filePath, 'utf8');
      return yaml;
    } catch (error) {
      console.error('Failed to get StorageClass YAML:', error);
      throw error;
    }
  }

  // Persistent Volume 相關法
  async createPersistentVolume(name, spec) {
    try {
      const persistentVolume = {
        apiVersion: 'v1',
        kind: 'PersistentVolume',
        metadata: {
          name,
          labels: {
            type: 'local'
          }
        },
        spec: {
          capacity: {
            storage: spec.capacity
          },
          volumeMode: spec.volumeMode || 'Filesystem',
          accessModes: spec.accessModes,
          persistentVolumeReclaimPolicy: spec.persistentVolumeReclaimPolicy || 'Retain',
          storageClassName: spec.storageClassName,
          local: {
            path: spec.local.path
          },
          nodeAffinity: spec.nodeAffinity
        }
      };

      const response = await this.k8sApi.createPersistentVolume(persistentVolume);
      return response.body;
    } catch (error) {
      console.error('Failed to create persistent volume:', error);
      throw error;
    }
  }

  // 獲取儲存狀態
  async getStorageStatus(namespace) {
    try {
      const [storageClasses, persistentVolumes, persistentVolumeClaims] = await Promise.all([
        this.listStorageClasses(),
        this.listPersistentVolumes(namespace),
        this.listPersistentVolumeClaims(namespace)
      ]);

      return {
        storageClasses: {
          total: storageClasses.length,
          default: storageClasses.find(sc => sc.isDefault)?.name
        },
        persistentVolumes: {
          total: persistentVolumes.length,
          available: persistentVolumes.filter(pv => pv.status === 'Available').length,
          bound: persistentVolumes.filter(pv => pv.status === 'Bound').length
        },
        persistentVolumeClaims: {
          total: persistentVolumeClaims.length,
          bound: persistentVolumeClaims.filter(pvc => pvc.status === 'Bound').length,
          pending: persistentVolumeClaims.filter(pvc => pvc.status === 'Pending').length
        }
      };
    } catch (error) {
      console.error('Failed to get storage status:', error);
      throw error;
    }
  }

  // 保存儲存配置
  async saveStorageConfig(name, version, storageClassYaml, persistentVolumeYaml) {
    try {
      const deploymentDir = path.join(__dirname, '../deploymentTemplate', name);
      const deployScriptsDir = path.join(deploymentDir, 'deploy-scripts');
      
      // Ensure directory exists
      await fs.mkdir(deployScriptsDir, { recursive: true });
      
      // Save YAML files in deploy-scripts folder
      if (storageClassYaml) {
        await fs.writeFile(
          path.join(deployScriptsDir, `${name}-${version}-storageClass.yaml`),
          storageClassYaml
        );
      }
      
      if (persistentVolumeYaml) {
        await fs.writeFile(
          path.join(deployScriptsDir, `${name}-${version}-persistentVolumes.yaml`),
          persistentVolumeYaml
        );
      }
      
      return {
        message: 'Storage configuration saved successfully',
        name,
        version
      };
    } catch (error) {
      console.error('Failed to save storage configuration:', error);
      throw error;
    }
  }

  // 獲取儲存配置
  async getStorageConfig(name, version) {
    try {
      const deployScriptsDir = path.join(
        __dirname,
        '../deploymentTemplate',
        name,
        'deploy-scripts'
      );
      
      const [storageClassYaml, persistentVolumeYaml] = await Promise.all([
        fs.readFile(
          path.join(deployScriptsDir, `${name}-${version}-storageClass.yaml`),
          'utf8'
        ).catch(() => ''),
        fs.readFile(
          path.join(deployScriptsDir, `${name}-${version}-persistentVolumes.yaml`),
          'utf8'
        ).catch(() => '')
      ]);
      
      return {
        storageClassYaml,
        persistentVolumeYaml
      };
    } catch (error) {
      console.error('Failed to get storage configuration:', error);
      throw error;
    }
  }

  async getNamespaces() {
    try {
      const { body } = await this.k8sApi.listNamespace();
      return body.items.map(ns => ({
        name: ns.metadata.name,
        status: ns.status.phase
      }));
    } catch (error) {
      console.error('Failed to fetch namespaces:', error);
      throw error;
    }
  }

  async createNamespaceYaml(name) {
    const namespaceConfig = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: name,
        labels: {
          'created-by': 'pod-deployment-system'
        }
      }
    };
    
    return yaml.dump(namespaceConfig);
  }

  async saveNamespaceYaml(deploymentName, namespace) {
    try {
      const deploymentDir = path.join(__dirname, '../deploymentTemplate', deploymentName);
      const namespaceDir = path.join(deploymentDir, 'namespaces');
      
      // 確保目錄存在
      await fs.mkdir(namespaceDir, { recursive: true });
      
      // 生成 namespace YAML
      const namespaceYaml = await this.createNamespaceYaml(namespace);
      
      // 保存 YAML 文件
      const filePath = path.join(namespaceDir, `${namespace}-namespace.yaml`);
      await fs.writeFile(filePath, namespaceYaml);
      
      console.log('✅ Namespace YAML saved:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ Failed to save namespace YAML:', error);
      throw error;
    }
  }

  async createNamespace(namespace) {
    try {
      console.log('📝 Creating K8s namespace:', namespace);

      const namespaceManifest = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: namespace
        }
      };

      const response = await this.k8sApi.createNamespace(namespaceManifest);
      console.log('✅ Namespace created:', response.body);
      return response.body;
    } catch (error) {
      console.error('❌ Failed to create namespace:', error);
      throw error;
    }
  }

  async namespaceExists(namespace) {
    try {
      await this.k8sApi.readNamespace(namespace);
      return true;
    } catch (error) {
      if (error.response?.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  // Delete storage configuration
  async deleteStorageConfig(name, version, type) {
    try {
      const deployScriptsDir = path.join(
        __dirname,
        '../deploymentTemplate',
        name,
        'deploy-scripts'
      );

      const fileName = type === 'storageClass' 
        ? `${name}-${version}-storageClass.yaml`
        : `${name}-${version}-persistentVolumes.yaml`;

      const filePath = path.join(deployScriptsDir, fileName);

      try {
        await fs.unlink(filePath);
        console.log(`Storage ${type} YAML deleted:`, filePath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
        // File doesn't exist - consider this a success
        console.log(`Storage ${type} YAML doesn't exist:`, filePath);
      }

      return {
        message: `Storage ${type} configuration deleted successfully`,
        path: filePath
      };
    } catch (error) {
      console.error('Failed to delete storage configuration:', error);
      throw error;
    }
  }

  async executeCommand(command) {
    try {
      const { stdout, stderr } = await execAsync(`kubectl ${command}`);
      if (stderr) {
        console.warn('Command stderr:', stderr);
      }
      return stdout;
    } catch (error) {
      throw new Error(`Command execution failed: ${error.message}`);
    }
  }

  // 在節點上創建目錄
  async createDirectoryOnNode(nodeName, directoryPath) {
    try {
      // 驗證路徑
      if (!directoryPath.startsWith('/')) {
        throw new Error('Directory path must be absolute (start with /)');
      }

      const localRegistryImage = process.env.LOCAL_REGISTRY_BUSYBOX_IMAGE || 'busybox:latest';
      const debugPodName = `node-debugger-${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        console.log(`Creating directory ${directoryPath} on node ${nodeName} using image ${localRegistryImage}`);
        
        // 簡化 Pod 配置
        const podManifest = {
          apiVersion: 'v1',
          kind: 'Pod',
          metadata: {
            name: debugPodName,
            namespace: 'dataisec'
          },
          spec: {
            nodeName: nodeName,
            containers: [{
              name: 'directory-creator',
              image: localRegistryImage,
              imagePullPolicy: 'IfNotPresent',
              command: ['sh', '-c'],
              args: [`set -x; mkdir -p ${directoryPath} && chmod 777 ${directoryPath} && ls -ld ${directoryPath}`],
              securityContext: {
                privileged: true,
                runAsUser: 0
              },
              volumeMounts: [{
                name: 'host-root',
                mountPath: directoryPath,
                subPath: directoryPath.substring(1) // 移除開頭的 '/'
              }]
            }],
            volumes: [{
              name: 'host-root',
              hostPath: {
                path: '/',
                type: 'Directory'
              }
            }],
            restartPolicy: 'Never',
            serviceAccountName: 'dataisec-platform-sa'
          }
        };

        // 創建 Pod
        console.log('Creating pod with manifest:', JSON.stringify(podManifest, null, 2));
        const createdPod = await this.k8sApi.createNamespacedPod('dataisec', podManifest);
        console.log('Pod created:', createdPod.body.metadata.name);

        // 等待 Pod 完成
        let podStatus = '';
        let retries = 30;
        let lastLogs = '';

        while (retries > 0) {
          const pod = await this.k8sApi.readNamespacedPod(debugPodName, 'dataisec');
          podStatus = pod.body.status.phase;
          console.log(`Pod status: ${podStatus}`);

          try {
            const logs = await this.k8sApi.readNamespacedPodLog(debugPodName, 'dataisec');
            lastLogs = logs.body;
            console.log('Current logs:', lastLogs);
          } catch (logError) {
            console.warn('Warning: Could not get logs yet');
          }

          if (podStatus === 'Succeeded' || podStatus === 'Failed') {
            break;
          }

          // 檢查容器狀態
          const containerStatuses = pod.body.status.containerStatuses;
          if (containerStatuses && containerStatuses[0]) {
            const state = containerStatuses[0].state;
            if (state.terminated) {
              if (state.terminated.exitCode !== 0) {
                throw new Error(`Container failed with exit code ${state.terminated.exitCode}: ${lastLogs}`);
              }
              break;
            }
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
          retries--;
        }

        if (retries === 0) {
          throw new Error('Timeout waiting for pod completion');
        }

        if (podStatus === 'Failed') {
          throw new Error(`Pod failed: ${lastLogs}`);
        }

        return {
          success: true,
          message: `Directory ${directoryPath} created on node ${nodeName}`,
          logs: lastLogs
        };

      } catch (innerError) {
        console.error('Error during pod execution:', innerError);
        throw new Error(`Failed to execute pod: ${innerError.message}`);
      } finally {
        // 清理 Pod
        try {
          console.log(`Cleaning up pod ${debugPodName}`);
          await this.k8sApi.deleteNamespacedPod(debugPodName, 'dataisec', {
            gracePeriodSeconds: 0
          });
        } catch (cleanupError) {
          console.warn('Warning: Failed to cleanup pod:', cleanupError);
        }
      }
    } catch (error) {
      console.error('Failed to create directory on node:', error);
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }
}

module.exports = new K8sService();
