const k8s = require('@kubernetes/client-node');
const { client } = require('../utils/opensearchClient');

class PodService {
  constructor() {
    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  // Unified namespace fetching method
  async getNamespaces() {
    try {
      console.log('Fetching namespaces...');
      const response = await this.k8sApi.listNamespace();
      
      if (!response || !response.body || !response.body.items) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response from Kubernetes API');
      }

      const namespaces = response.body.items
        .filter(ns => !ns.metadata.name.startsWith('kube-'))  // Filter out system namespaces
        .map(ns => ns.metadata.name);

      console.log('Found namespaces:', namespaces);

      return {
        namespaces,
        total: namespaces.length
      };
    } catch (error) {
      console.error('Failed to get namespaces:', error);
      if (error.response) {
        console.error('API Response:', {
          status: error.response.statusCode,
          body: error.response.body
        });
      }
      throw error;
    }
  }

  // 獲取指定命名空間的所有 Pod
  async getPods(namespace = '') {
    try {
      console.log(`Fetching pods for namespace: ${namespace || 'all namespaces'}`);
      let pods;
      if (namespace) {
        const response = await this.k8sApi.listNamespacedPod(namespace);
        pods = response.body.items;
      } else {
        const response = await this.k8sApi.listPodForAllNamespaces();
        pods = response.body.items;
      }
      console.log(`Found ${pods.length} pods`);

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
      console.error('Failed to get pods:', error);
      throw error;
    }
  }

  // 從 metricbeat 獲取 Pod 指標
  async getPodMetrics(podName, namespace) {
    try {
      console.log(`Fetching metrics for pod: ${podName} in namespace: ${namespace}`);
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
        console.log(`✅ Metrics found for pod: ${podName}`);
        return {
          cpu: metrics.kubernetes?.pod?.cpu?.usage?.nanocores || 0,
          memory: metrics.kubernetes?.pod?.memory?.usage?.bytes || 0,
          network: {
            rx: metrics.kubernetes?.pod?.network?.rx?.bytes || 0,
            tx: metrics.kubernetes?.pod?.network?.tx?.bytes || 0
          }
        };
      }

      console.log(`ℹ️ No metrics found for pod: ${podName}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching metrics for pod ${podName}:`, error);
      // 返回空值而不是拋出錯誤，這樣不會影響 Pod 列表的顯示
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
    console.log(`Attempting to delete pod: ${name} from namespace: ${namespace}`);
    try {
      await this.k8sApi.deleteNamespacedPod(name, namespace);
      console.log(`Successfully deleted pod: ${name}`);
      
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
      console.error(`Failed to delete pod ${name}:`, error);
      
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
      console.log('開始計算資源使用情況:', { podName, namespace, timeRange });
      
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