const k8s = require('@kubernetes/client-node');
const { client } = require('../utils/opensearchClient');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class PodService {
  constructor() {
    this.kc = new k8s.KubeConfig();
    
    try {
      // 首先嘗試使用環境變數中指定的 kubeconfig
      if (process.env.KUBECONFIG && fs.existsSync(process.env.KUBECONFIG)) {
        logger.info('Using kubeconfig from KUBECONFIG env:', process.env.KUBECONFIG);
        this.kc.loadFromFile(process.env.KUBECONFIG);
      }
      // 如果在 Kubernetes 集群內運行，使用 ServiceAccount 憑證
      else if (process.env.KUBERNETES_SERVICE_HOST && 
        fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token')) {
        logger.info('Loading in-cluster configuration');
        this.kc.loadFromCluster();
        
        // 確保設置正確的 API 服務器地址
        const k8sHost = process.env.KUBERNETES_SERVICE_HOST;
        const k8sPort = process.env.KUBERNETES_SERVICE_PORT;
        logger.info(`Kubernetes API Server: https://${k8sHost}:${k8sPort}`);
      }
      // 最後嘗試加載默認配置
      else {
        logger.info('Loading default kubeconfig');
        this.kc.loadFromDefault();
      }

      this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
      
      // 在初始化時立即驗證權限
      this.validatePermissions().catch(error => {
        logger.error('Failed to validate Kubernetes permissions:', error);
        // 不要在這裡拋出錯誤，而是記錄它
        logger.error('Service will continue to run, but some functions may be limited');
      });
    } catch (error) {
      logger.error('Error initializing Kubernetes configuration:', error);
      throw new Error('Failed to initialize Kubernetes configuration: ' + error.message);
    }
  }

  // 驗證 Kubernetes 權限
  async validatePermissions() {
    try {
      logger.info('Validating Kubernetes permissions...');
      
      // 首先驗證 API 服務器連接
      try {
        // 使用更簡單的 API 調用來測試連接
        await this.k8sApi.getAPIResources();
        logger.info('✅ Successfully connected to Kubernetes API server');
      } catch (error) {
        logger.error('❌ Failed to connect to Kubernetes API server:', error);
        throw new Error(`API Server connection failed: ${error.message}`);
      }
      
      // 測試必要的權限
      const permissionTests = [
        // 測試 Pod 列表權限
        {
          test: () => this.k8sApi.listNamespacedPod('default', undefined, undefined, undefined, undefined, undefined, 1),
          permission: 'list pods'
        },
        // 測試命名空間列表權限
        {
          test: () => this.k8sApi.listNamespace(undefined, undefined, undefined, undefined, undefined, 1),
          permission: 'list namespaces'
        }
      ];

      // 執行所有權限測試
      const results = await Promise.all(permissionTests.map(async ({ test, permission }) => {
        try {
          await test();
          logger.info(`✅ Has permission to ${permission}`);
          return { permission, success: true };
        } catch (error) {
          const errorMessage = error.body?.message || error.message;
          logger.error(`❌ Lacks permission to ${permission}:`, errorMessage);
          return { permission, success: false, error: errorMessage };
        }
      }));

      // 檢查是否有任何權限測試失敗
      const failedTests = results.filter(result => !result.success);
      if (failedTests.length > 0) {
        const errors = failedTests.map(test => 
          `Missing permission: ${test.permission} - ${test.error}`
        ).join('\n');
        throw new Error(`Insufficient Kubernetes permissions:\n${errors}`);
      }

      logger.info('✅ All required Kubernetes permissions validated successfully');
      return true;
    } catch (error) {
      logger.error('❌ Failed to validate Kubernetes permissions:', error);
      throw error;
    }
  }

  // 檢查特定資源的權限
  async checkResourcePermission(resource, verb, namespace = 'default') {
    try {
      logger.info(`Checking permission for ${verb} ${resource} in namespace ${namespace}`);
      
      const authApi = this.kc.makeApiClient(k8s.AuthorizationV1Api);
      const accessReview = {
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SelfSubjectAccessReview',
        spec: {
          resourceAttributes: {
            namespace: namespace,
            verb: verb,
            resource: resource,
            group: ''  // 核心 API 組為空字符串
          }
        }
      };

      const response = await authApi.createSelfSubjectAccessReview(accessReview);
      const allowed = response.body.status.allowed;
      
      logger.info(`Permission check result for ${verb} ${resource}: ${allowed ? '允許' : '拒絕'}`);
      return allowed;
    } catch (error) {
      logger.error(`Error checking permission for ${verb} ${resource}:`, error);
      throw error;
    }
  }

  // Unified namespace fetching method
  async getNamespaces() {
    try {
      logger.info('Fetching namespaces...');
      const response = await this.k8sApi.listNamespace();
      logger.info('namespace list from backend:', response.body.items);
      if (!response || !response.body || !response.body.items) {
        logger.info('Invalid response structure:', response);
        throw new Error('Invalid response from Kubernetes API');
      }
      logger.info('namespace list from backend:', response.body.items);
      const namespaces = response.body.items
        .filter(ns => !ns.metadata.name.startsWith('kube-'))  // Filter out system namespaces
        .map(ns => ns.metadata.name);

      logger.info('Found namespaces:', namespaces);

      return {
        namespaces,
        total: namespaces.length
      };
    } catch (error) {
      logger.info ('Failed to get namespaces:', error);
      if (error.response) {
        logger.info('API Response:', {
          status: error.response.statusCode,
          body: error.response.body
        });
      }
      throw error;
    }
  }

  // 獲取指定命名空間的所有 Pod
  async getPods(namespace = '', search = '') {
    try {
      // 在獲取 Pod 之前檢查權限
      const hasPermission = await this.checkResourcePermission('pods', 'list', namespace);
      if (!hasPermission) {
        throw new Error(`沒有權限列出命名空間 ${namespace || 'all'} 中的 Pod`);
      }

      logger.info(`Fetching pods for namespace: ${namespace || 'all namespaces'}, search: ${search}`);
      let pods;
      if (namespace) {
        const response = await this.k8sApi.listNamespacedPod(namespace);
        pods = response.body.items;
      } else {
        const response = await this.k8sApi.listPodForAllNamespaces();
        pods = response.body.items;
      }

      // 如果有搜索條件，進行過濾
      if (search) {
        const searchLower = search.toLowerCase();
        pods = pods.filter(pod => 
          pod.metadata.name.toLowerCase().includes(searchLower) ||
          pod.metadata.namespace.toLowerCase().includes(searchLower)
        );
      }

      logger.info(`Found ${pods.length} pods after filtering`);

      // 獲取 Pod 的額外信息
      const podDetails = await Promise.all(
        pods.map(async pod => {
          const metrics = await this.getPodMetrics(pod.metadata.name, pod.metadata.namespace);
          return {
            name: pod.metadata.name,
            namespace: pod.metadata.namespace,
            status: pod.status.phase,
            node: pod.spec.nodeName,
            podIP: pod.status.podIP,
            hostIP: pod.status.hostIP,
            startTime: pod.status.startTime,
            restarts: this.calculateRestarts(pod),
            age: this.calculateAge(pod.metadata.creationTimestamp),
            readyContainers: this.getReadyContainers(pod),
            totalContainers: pod.spec.containers.length,
            images: pod.spec.containers.map(c => c.image),
            labels: pod.metadata.labels,
            metrics: metrics
          };
        })
      );

      return podDetails;
    } catch (error) {
      logger.info('Failed to get pods:', error);
      throw error;
    }
  }

  // 從 metricbeat 獲取 Pod 指標
  async getPodMetrics(podName, namespace) {
    try {
      logger.info(`Fetching metrics for pod: ${podName} in namespace: ${namespace}`);
      const response = await client.search({
        index: process.env.OPENSEARCH_POD_METRICS_INDEX || 'metricbeat-*',
        body: {
          size: 1,
          sort: [{ '@timestamp': 'desc' }],
          query: {
            bool: {
              must: [
                { match: { 'kubernetes.pod.name': podName } },
                { match: { 'kubernetes.namespace': namespace } }
              ]
            }
          }
        }
      });

      if (response.body.hits.total.value > 0) {
        const metrics = response.body.hits.hits[0]._source;
        logger.info(`✅ Metrics found for pod: ${podName}`);
        return {
          cpu: metrics.kubernetes?.pod?.cpu?.usage?.nanocores || 0,
          memory: metrics.kubernetes?.pod?.memory?.usage?.bytes || 0,
          network: {
            rx: metrics.kubernetes?.pod?.network?.rx?.bytes || 0,
            tx: metrics.kubernetes?.pod?.network?.tx?.bytes || 0
          }
        };
      }

      logger.info(`ℹ️ No metrics found for pod: ${podName}`);
      return null;
    } catch (error) {
      logger.info(`❌ Error fetching metrics for pod ${podName}:`, error);
      return null;
    }
  }

  // 計算容器重啟次數
  calculateRestarts(pod) {
    return pod.status.containerStatuses?.reduce(
      (total, container) => total + container.restartCount,
      0
    ) || 0;
  }

  // 計算 Pod 年齡
  calculateAge(creationTimestamp) {
    const created = new Date(creationTimestamp);
    const now = new Date();
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}d${diffHours}h`;
    }
    return `${diffHours}h`;
  }

  // 獲取就緒容器數量
  getReadyContainers(pod) {
    return pod.status.containerStatuses?.filter(
      container => container.ready
    ).length || 0;
  }

  // 刪除 Pod
  async deletePod(name, namespace) {
    logger.info(`Attempting to delete pod: ${name} from namespace: ${namespace}`);
    try {
      // 檢查刪除權限
      const hasPermission = await this.checkResourcePermission('pods', 'delete', namespace);
      if (!hasPermission) {
        throw new Error(`沒有權限刪除命名空間 ${namespace} 中的 Pod ${name}`);
      }

      await this.k8sApi.deleteNamespacedPod(name, namespace);
      logger.info(`Successfully deleted pod: ${name}`);
      
      // 記錄刪除操作
      await client.index({
        index: process.env.OPENSEARCH_AUDIT_LOG_INDEX,
        body: {
          action: 'DELETE_POD',
          resource: name,
          namespace: namespace,
          timestamp: new Date(),
          status: 'SUCCESS'
        }
      });
    } catch (error) {
      logger.info(`Failed to delete pod ${name}:`, error);
      
      // 記錄錯誤
      await client.index({
        index: process.env.OPENSEARCH_AUDIT_LOG_INDEX,
        body: {
          action: 'DELETE_POD',
          resource: name,
          namespace: namespace,
          timestamp: new Date(),
          status: 'FAILED',
          error: error.message
        }
      });
      
      throw error;
    }
  }

  // Calculate pod resources from OpenSearch metrics
  async calculatePodResources(podName, namespace, timeRange = '15m') {
    try {
      logger.info('開始計算資源使用情況:', { podName, namespace, timeRange });
      
      const searchQuery = {
        index: process.env.OPENSEARCH_POD_METRICS_INDEX || 'metricbeat-*',
        body: {
          size: 0,
          query: {
            bool: {
              must: [
                {
                  match: {
                    'kubernetes.pod.name': podName
                  }
                },
                {
                  match: {
                    'kubernetes.namespace': namespace
                  }
                },
                {
                  range: {
                    '@timestamp': {
                      gte: `now-${timeRange}`
                    }
                  }
                }
              ]
            }
          },
          aggs: {
            cpu_usage: {
              avg: {
                field: 'kubernetes.pod.cpu.usage.nanocores'
              }
            },
            memory_usage: {
              avg: {
                field: 'kubernetes.pod.memory.usage.bytes'
              }
            },
            cpu_requests: {
              avg: {
                field: 'kubernetes.pod.cpu.request.cores'
              }
            },
            cpu_limits: {
              avg: {
                field: 'kubernetes.pod.cpu.limit.cores'
              }
            },
            memory_requests: {
              avg: {
                field: 'kubernetes.pod.memory.request.bytes'
              }
            },
            memory_limits: {
              avg: {
                field: 'kubernetes.pod.memory.limit.bytes'
              }
            }
          }
        }
      };
      
      console.log('OpenSearch 查詢:', JSON.stringify(searchQuery, null, 2));
      
      const response = await client.search(searchQuery);
      
      console.log('OpenSearch 響應狀態:', {
        total_hits: response.body.hits.total.value,
        took: response.body.took,
        timed_out: response.body.timed_out
      });

      const aggs = response.body.aggregations;
      
      console.log('聚合結果:', {
        cpu_usage: aggs.cpu_usage.value,
        memory_usage: aggs.memory_usage.value,
        cpu_requests: aggs.cpu_requests.value,
        cpu_limits: aggs.cpu_limits.value,
        memory_requests: aggs.memory_requests.value,
        memory_limits: aggs.memory_limits.value
      });
      
      const result = {
        cpu: {
          usage: aggs.cpu_usage.value || 0,
          requests: aggs.cpu_requests.value || 0,
          limits: aggs.cpu_limits.value || 0
        },
        memory: {
          usage: aggs.memory_usage.value || 0,
          requests: aggs.memory_requests.value || 0,
          limits: aggs.memory_limits.value || 0
        }
      };
      
      console.log('最終計算結果:', result);
      return result;
      
    } catch (error) {
      console.error('計算資源使用時發生錯誤:', error);
      console.error('錯誤堆疊:', error.stack);
      throw error;
    }
  }

  // Helper function to parse time range
  parseTimeRange(timeRange) {
    const unit = timeRange.slice(-1);
    const value = parseInt(timeRange.slice(0, -1));
    
    switch (unit) {
      case 'm': return value * 60 * 1000;        // minutes
      case 'h': return value * 60 * 60 * 1000;   // hours
      case 'd': return value * 24 * 60 * 60 * 1000; // days
      default: return 15 * 60 * 1000;  // default 15 minutes
    }
  }
}

module.exports = new PodService();
