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
      console.warn('[getNodeMetrics] Missing node name in request');
      return res.status(400).json({ message: 'Node name is required' });
    }

    console.log(`[getNodeMetrics] Starting metrics retrieval for node: ${nodeName}, timeRange: ${timeRange}`);
    console.log(`[getNodeMetrics] OpenSearch index: ${process.env.OPENSEARCH_SYSTEM_METRICS_INDEX}`);

    // 構建查詢體，使用與 cluster metrics 相似的結構
    const searchBody = {
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
            // CPU 指標 - 使用與 cluster metrics 相同的字段
            total_cpu_usage: {
              avg: {
                field: 'kubernetes.node.cpu.usage.nanocores'
              }
            },
            total_cpu_cores: {
              max: {
                field: 'kubernetes.node.cpu.capacity.cores'
              }
            },
            // 記憶體指標
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
            }
          }
        }
      }
    };

    console.log('[getNodeMetrics] OpenSearch query:', JSON.stringify(searchBody, null, 2));

    const searchResponse = await client.search({
      index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX,
      body: searchBody
    });

    console.log('[getNodeMetrics] OpenSearch response status:', searchResponse.statusCode);

    if (!searchResponse?.body?.aggregations?.time_buckets?.buckets) {
      console.error('[getNodeMetrics] Invalid response structure');
      return res.status(500).json({ 
        message: 'Invalid response format from metrics store',
        details: {
          hasBody: !!searchResponse?.body,
          hasAggregations: !!searchResponse?.body?.aggregations,
          hasTimeBuckets: !!searchResponse?.body?.aggregations?.time_buckets,
          hasBuckets: !!searchResponse?.body?.aggregations?.time_buckets?.buckets
        }
      });
    }

    const buckets = searchResponse.body.aggregations.time_buckets.buckets;
    console.log(`[getNodeMetrics] Found ${buckets.length} time buckets`);

    // 使用與 cluster metrics 相同的數據處理邏輯
    const metrics = {
      [nodeName]: {
        cpu: buckets.map(bucket => {
          const usedCores = (bucket.total_cpu_usage.value || 0) / 1000000000; // 將 nanocores 轉換為 cores
          const totalCores = bucket.total_cpu_cores.value || 1;
          return {
            timestamp: bucket.key_as_string,
            value: usedCores,
            display: `${usedCores.toFixed(2)} cores`,
            total: totalCores,
            valueType: 'cores'
          };
        }),
        memory: buckets.map(bucket => {
          const total = bucket.memory_total.value || 1;
          const used = bucket.memory_used.value || 0;
          const percentage = (used / total) * 100;
          return {
            timestamp: bucket.key_as_string,
            value: used,
            display: `${percentage.toFixed(2)}%`,
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
          free: (buckets[0]?.fs_total.value || 0) - (buckets[0]?.fs_used.value || 0),
          displayTotal: formatBytes(buckets[0]?.fs_total.value || 0),
          displayUsed: formatBytes(buckets[0]?.fs_used.value || 0),
          displayFree: formatBytes((buckets[0]?.fs_total.value || 0) - (buckets[0]?.fs_used.value || 0))
        }
      }
    };

    console.log(`[getNodeMetrics] Successfully processed metrics for node ${nodeName}`);
    res.json(metrics);

  } catch (error) {
    console.error('[getNodeMetrics] Error occurred:', error);
    console.error('[getNodeMetrics] Error details:', {
      message: error.message,
      stack: error.stack,
      opensearchResponse: error.meta?.body || 'No OpenSearch response available'
    });

    res.status(500).json({ 
      message: 'Failed to fetch node metrics', 
      error: error.message,
      details: error.stack,
      opensearchError: error.meta?.body || null
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
