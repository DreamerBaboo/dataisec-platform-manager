const k8s = require('@kubernetes/client-node');
const yaml = require('js-yaml');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class K8sService {
  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sAppsApi = this.kc.makeApiClient(k8s.AppsV1Api);
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
}

module.exports = new K8sService(); 