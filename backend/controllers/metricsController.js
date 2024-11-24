const { client } = require('../utils/opensearchClient');
const k8sService = require('../services/k8sService');

// 獲取集群級別的系統指標
const getClusterMetrics = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '15m';

    const response = await client.search({
      index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX,
      body: {
        size: 0,
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: `now-${timeRange}`,
                    lte: 'now'
                  }
                }
              }
            ]
          }
        },
        aggs: {
          time_buckets: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '30s',
              time_zone: 'Asia/Taipei'
            },
            aggs: {
              // CPU 指標 - 計算所有節點的 CPU 使用量總和
              total_cpu_usage: {
                sum: {
                  field: 'kubernetes.node.cpu.usage.nanocores'
                }
              },
              // 計算總核心數 (所有節點的核心數總和)
              total_cpu_cores: {
                sum: {
                  field: 'kubernetes.node.cpu.capacity.cores'
                }
              },
              // 其他指標保持不變
              memory_total: {
                sum: {
                  field: 'kubernetes.node.memory.capacity.bytes'
                }
              },
              memory_used: {
                avg: {
                  field: 'kubernetes.node.memory.usage.bytes'
                }
              },
              memory_free: {
                avg: {
                  field: 'system.memory.free'
                }
              },
              network_in: {
                sum: {
                  field: 'kubernetes.node.network.rx.bytes'
                }
              },
              network_out: {
                sum: {
                  field: 'kubernetes.node.network.tx.bytes'
                }
              },
              fs_total: {
                sum: {
                  field: 'kubernetes.node.fs.capacity.bytes'
                }
              },
              fs_used: {
                sum: {
                  field: 'kubernetes.node.fs.used.bytes'
                }
              },
              fs_free: {
                avg: {
                  field: 'system.filesystem.free'
                }
              }
            }
          }
        }
      }
    });

    const buckets = response.body.aggregations.time_buckets.buckets;
    const metrics = {
      cluster: {
        cpu: buckets.map(bucket => {
          const usedCores = (bucket.total_cpu_usage.value || 0) / 1000000000; // 將 nanocores 轉換為 cores
          const totalCores = bucket.total_cpu_cores.value || 1;
          return {
            timestamp: bucket.key_as_string,
            value: usedCores,
            display: `${usedCores.toFixed(2)} cores`,
            total: usedCores + 40,
            valueType: 'cores'
          };
        }),
        memory: buckets.map(bucket => {
          const total = bucket.memory_total.value || 1;
          const used = bucket.memory_used.value || 0;
          const percentage = (used / total) * 100;
          return {
            timestamp: bucket.key_as_string,
            value: percentage,
            display: `${percentage.toFixed(2)}%`,
            used: formatBytes(used),
            total: formatBytes(total)
          };
        }),
        network: {
          tx: buckets.map(bucket => ({
            timestamp: bucket.key_as_string,
            value: bucket.network_out.value || 0,
            rate: (bucket.network_out.value || 0) / 30,
            display: formatBytes(bucket.network_out.value || 0)
          })),
          rx: buckets.map(bucket => ({
            timestamp: bucket.key_as_string,
            value: bucket.network_in.value || 0,
            rate: (bucket.network_in.value || 0) / 30,
            display: formatBytes(bucket.network_in.value || 0)
          }))
        },
        storage: {
          total: buckets[0]?.fs_total.value || 0,
          used: buckets[0]?.fs_used.value || 0,
          free: buckets[0]?.fs_free.value || 0,
          displayTotal: formatBytes(buckets[0]?.fs_total.value || 0),
          displayUsed: formatBytes(buckets[0]?.fs_used.value || 0),
          displayFree: formatBytes(buckets[0]?.fs_free.value || 0)
        }
      }
    };

    console.log('Generated metrics:', metrics);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching cluster metrics:', error);
    res.status(500).json({ message: 'Failed to fetch cluster metrics', error: error.message });
  }
};

// 獲取節點級別的指標
const getNodeMetrics = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '15m';
    const nodeName = req.params.nodeName;

    if (!nodeName) {
      return res.status(400).json({ message: 'Node name is required' });
    }

    console.log(`[getNodeMetrics] Starting metrics retrieval for node: ${nodeName}, timeRange: ${timeRange}`);
    console.log(`[getNodeMetrics] Using OpenSearch index: ${process.env.OPENSEARCH_SYSTEM_METRICS_INDEX}`);

    const queryBody = {
      size: 0,
      query: {
        bool: {
          must: [
            {
              range: {
                '@timestamp': {
                  gte: `now-${timeRange}`,
                  lte: 'now'
                }
              }
            },
            {
              term: {
                'kubernetes.node.name': nodeName
              }
            }
          ]
        }
      },
      aggs: {
        time_buckets: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '30s',
            time_zone: 'Asia/Taipei'
          },
          aggs: {
            cpu_usage: {
              avg: {
                field: 'kubernetes.node.cpu.usage.nanocores'
              }
            },
            memory_total: {
              max: {
                field: 'kubernetes.node.memory.capacity.bytes'
              }
            },
            memory_used: {
              avg: {
                field: 'kubernetes.node.memory.usage.bytes'
              }
            },
            memory_free: {
              avg: {
                field: 'kubernetes.node.memory.available.bytes'
              }
            },
            network_in: {
              avg: {
                field: 'kubernetes.node.network.rx.bytes'
              }
            },
            network_out: {
              avg: {
                field: 'kubernetes.node.network.tx.bytes'
              }
            },
            fs_total: {
              max: {
                field: 'kubernetes.node.fs.capacity.bytes'
              }
            },
            fs_used: {
              avg: {
                field: 'kubernetes.node.fs.used.bytes'
              }
            },
            fs_free: {
              avg: {
                field: 'kubernetes.node.fs.available.bytes'
              }
            }
          }
        }
      }
    };

    console.log('[getNodeMetrics] OpenSearch query:', JSON.stringify(queryBody, null, 2));

    const response = await client.search({
      index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX,
      body: queryBody
    });

    console.log('[getNodeMetrics] OpenSearch raw response:', JSON.stringify(response.body, null, 2));

    if (!response.body?.aggregations?.time_buckets?.buckets) {
      console.error('[getNodeMetrics] Invalid response structure. Expected aggregations.time_buckets.buckets');
      console.error('[getNodeMetrics] Response body:', JSON.stringify(response.body, null, 2));
      return res.status(500).json({ 
        message: 'Invalid response format from metrics store',
        details: {
          hasAggregations: !!response.body?.aggregations,
          hasTimeBuckets: !!response.body?.aggregations?.time_buckets,
          hasBuckets: !!response.body?.aggregations?.time_buckets?.buckets
        }
      });
    }

    const buckets = response.body.aggregations.time_buckets.buckets;
    console.log(`[getNodeMetrics] Found ${buckets.length} time buckets for node ${nodeName}`);

    if (buckets.length === 0) {
      console.warn(`[getNodeMetrics] No metrics found for node ${nodeName} in the last ${timeRange}`);
      console.log('[getNodeMetrics] Query details:', {
        index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX,
        nodeName,
        timeRange
      });
      return res.status(404).json({ 
        message: `No metrics found for node ${nodeName}`,
        details: {
          timeRange,
          index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX
        }
      });
    }

    // Log the first bucket to help debug field mappings
    console.log('[getNodeMetrics] Sample bucket data:', JSON.stringify(buckets[0], null, 2));

    const metrics = {
      [nodeName]: {
        cpu: buckets.map(bucket => ({
            timestamp: bucket.key_as_string,
          value: (bucket.cpu_usage.value || 0) / 1000000000, // 將 nanocores 轉換為 cores
          display: `${((bucket.cpu_usage.value || 0) / 1000000000).toFixed(2)} cores`,
            valueType: 'cores'
        })),
        memory: buckets.map(bucket => {
          const total = bucket.memory_free.value + bucket.memory_used.value || 1;
          const used = bucket.memory_used.value || 0;
          const free = bucket.memory_free.value || 0;
          const percentage = (used / total) * 100;
          return {
            timestamp: bucket.key_as_string,
            value: used,
            display: `${percentage.toFixed(2)}`,
            used: formatBytes(used),
            total: formatBytes(total),
            valueType: 'gigabytes'
          };
        }),
        network: {
          tx: buckets.map(bucket => ({
            timestamp: bucket.key_as_string,
            value: bucket.network_out.value || 0,
            rate: (bucket.network_out.value || 0) / 30,
            display: formatBytes(bucket.network_out.value || 0)
          })),
          rx: buckets.map(bucket => ({
            timestamp: bucket.key_as_string,
            value: bucket.network_in.value || 0,
            rate: (bucket.network_in.value || 0) / 30,
            display: formatBytes(bucket.network_in.value || 0)
          }))
        },
        storage: {
          total: buckets[0]?.fs_total.value || 0,
          used: buckets[0]?.fs_used.value || 0,
          free: buckets[0]?.fs_free.value || 0,
          displayTotal: formatBytes(buckets[0]?.fs_total.value || 0),
          displayUsed: formatBytes(buckets[0]?.fs_used.value || 0),
          displayFree: formatBytes(buckets[0]?.fs_free.value || 0)
        }
      }
    };

    console.log(`[getNodeMetrics] Successfully processed metrics for node ${nodeName}`);
    console.log('[getNodeMetrics] Returning metrics structure:', JSON.stringify(metrics, null, 2));

    res.json(metrics);
  } catch (error) {
    console.error('[getNodeMetrics] Error:', error);
    console.error('[getNodeMetrics] Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.body
    });
    res.status(500).json({ 
      message: 'Failed to fetch node metrics', 
      error: error.message,
      details: error.response?.body || error.stack
    });
  }
};

// 獲取節點列表
const getNodes = async (req, res) => {
  try {
    const nodes = await k8sService.getNodes();
    res.json(nodes.items);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
};

// 獲取 Pod 指標
const getPodMetrics = async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '15m';
    const podName = req.query.podName;

    if (!podName) {
      return res.status(400).json({ message: 'Pod name is required' });
    }

    const response = await client.search({
      index: process.env.OPENSEARCH_POD_METRICS_INDEX,
      body: {
        size: 0,
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: `now-${timeRange}`,
                    lte: 'now'
                  }
                }
              },
              {
                term: {
                  'kubernetes.pod.name': podName
                }
              }
            ]
          }
        },
        aggs: {
          time_buckets: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '30s',
              time_zone: 'Asia/Taipei'
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
              network_in: {
                sum: {
                  field: 'kubernetes.pod.network.rx.bytes'
                }
              },
              network_out: {
                sum: {
                  field: 'kubernetes.pod.network.tx.bytes'
                }
              }
            }
          }
        }
      }
    });

    const metrics = processPodMetrics(response.body.aggregations);
    res.json({ [podName]: metrics });
  } catch (error) {
    console.error('Error fetching pod metrics:', error);
    res.status(500).json({ message: 'Failed to fetch pod metrics', error: error.message });
  }
};

// 處理 Pod 指標數據的輔助函數
const processPodMetrics = (aggregations) => {
  const buckets = aggregations.time_buckets.buckets;
  return {
    cpu: buckets.map(bucket => ({
      timestamp: bucket.key_as_string,
      value: (bucket.cpu_usage.value || 0) / 1000000000, // 轉換為核心數
      display: `${((bucket.cpu_usage.value || 0) / 1000000000).toFixed(2)} cores`
    })),
    memory: buckets.map(bucket => ({
      timestamp: bucket.key_as_string,
      value: bucket.memory_usage.value || 0,
      display: formatBytes(bucket.memory_usage.value || 0)
    })),
    network: {
      rx: buckets.map(bucket => ({
        timestamp: bucket.key_as_string,
        value: bucket.network_in.value || 0,
        rate: (bucket.network_in.value || 0) / 30,
        display: formatBytes(bucket.network_in.value || 0)
      })),
      tx: buckets.map(bucket => ({
        timestamp: bucket.key_as_string,
        value: bucket.network_out.value || 0,
        rate: (bucket.network_out.value || 0) / 30,
        display: formatBytes(bucket.network_out.value || 0)
      }))
    }
  };
};

// 格式化字節大小的輔助函數
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 導出所有函數
module.exports = {
  getClusterMetrics,
  getNodeMetrics,
  getNodes,
  getPodMetrics
};
