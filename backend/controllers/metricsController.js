const { client } = require('../utils/opensearchClient');

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
              // CPU 指標
              system_cpu: {
                avg: {
                  field: 'system.cpu.total.pct'
                }
              },
              user_cpu: {
                avg: {
                  field: 'system.cpu.user.pct'
                }
              },
              cpu_cores: {
                max: {
                  field: 'system.cpu.cores'
                }
              },
              // 內存指標
              memory_total: {
                max: {
                  field: 'system.memory.total'
                }
              },
              memory_used: {
                avg: {
                  field: 'system.memory.used.bytes'
                }
              },
              memory_free: {
                avg: {
                  field: 'system.memory.free'
                }
              },
              // 網絡指標
              network_in: {
                sum: {
                  field: 'system.network.in.bytes'
                }
              },
              network_out: {
                sum: {
                  field: 'system.network.out.bytes'
                }
              },
              // 存儲指標
              fs_total: {
                max: {
                  field: 'system.filesystem.total'
                }
              },
              fs_used: {
                avg: {
                  field: 'system.filesystem.used.bytes'
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
        cpu: buckets.map(bucket => ({
          timestamp: bucket.key_as_string,
          value: ((bucket.system_cpu.value + bucket.user_cpu.value) * 100) || 0,
          display: `${(((bucket.system_cpu.value + bucket.user_cpu.value) * 100) || 0).toFixed(2)}%`
        })),
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
              // CPU 指標 - 只使用 usage.nanocores
              cpu_usage: {
                avg: {
                  field: 'kubernetes.node.cpu.usage.nanocores'
                }
              },
              // 內存指標
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
              // 網絡指標
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
              // 存儲指標
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
      }
    });

    const buckets = response.body.aggregations.time_buckets.buckets;
    console.log('buckets: ', buckets);
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

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching node metrics:', error);
    res.status(500).json({ message: 'Failed to fetch node metrics', error: error.message });
  }
};

// 獲取節點列表
const getNodes = async (req, res) => {
  try {
    const response = await client.search({
      index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX,
      body: {
        size: 0,
        query: {
          range: {
            '@timestamp': {
              gte: 'now-1m'
            }
          }
        },
        aggs: {
          unique_nodes: {
            terms: {
              field: 'kubernetes.node.name',
              size: 100
            }
          }
        }
      }
    });

    // 不再在這裡添加 cluster 選項，讓前端處理
    const nodes = response.body.aggregations.unique_nodes.buckets.map(bucket => ({
      name: bucket.key,
      count: bucket.doc_count
    }));

    console.log('Found nodes:', nodes);
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ message: 'Failed to fetch nodes', error: error.message });
  }
};

// 格式化字節大小的輔助函數
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

// 導出所有函數
module.exports = {
  getClusterMetrics,
  getNodeMetrics,
  getNodes,
  getPodMetrics
};
