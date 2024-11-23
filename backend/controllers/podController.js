const { client } = require('../utils/opensearchClient');

// 獲取命名空間列表
const getNamespaces = async (req, res) => {
  console.log('getNamespaces process');
  try {
    const response = await client.search({
      index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX,
      body: {
        size: 0,
        aggs: {
          namespaces: {
            terms: {
              field: 'kubernetes.namespace',
              size: 100
            }
          }
        }
      }
    });

    const namespaces = response.body.aggregations.namespaces.buckets.map(bucket => bucket.key);
    res.json({ namespaces });
  } catch (error) {
    console.error('Error fetching namespaces:', error);
    res.status(500).json({ message: 'Failed to fetch namespaces', error: error.message });
  }
};

// 獲取 Pod 列表
const getPods = async (req, res) => {
  try {
    const { namespace, search } = req.query;
    const must = [
      {
        range: {
          '@timestamp': {
            gte: 'now-1m'
          }
        }
      }
    ];

    if (namespace && namespace !== 'all') {
      must.push({
        term: {
          'kubernetes.namespace': namespace
        }
      });
    }

    if (search) {
      must.push({
        wildcard: {
          'kubernetes.pod.name': `*${search}*`
        }
      });
    }

    // First, get the latest timestamp for each pod
    const latestTimestamps = await client.search({
      index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX,
      body: {
        size: 0,
        query: {
          bool: { must }
        },
        aggs: {
          pods: {
            terms: {
              field: 'kubernetes.pod.name',
              size: 1000
            },
            aggs: {
              latest_timestamp: {
                max: {
                  field: '@timestamp'
                }
              }
            }
          }
        }
      }
    });

    // Get the actual pod data using the latest timestamps
    const podPromises = latestTimestamps.body.aggregations.pods.buckets.map(async pod => {
      const podResponse = await client.search({
        index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX,
        body: {
          size: 1,
          query: {
            bool: {
              must: [
                {
                  term: {
                    'kubernetes.pod.name': pod.key
                  }
                },
                {
                  term: {
                    '@timestamp': pod.latest_timestamp.value
                  }
                }
              ]
            }
          }
        }
      });

      if (podResponse.body.hits.hits.length === 0) {
        return null;
      }

      const source = podResponse.body.hits.hits[0]._source;
      return {
        name: source.kubernetes?.pod?.name,
        namespace: source.kubernetes?.namespace,
        status: source.kubernetes?.pod?.status?.phase || 'Unknown',
        startTime: source.kubernetes?.pod?.start_time,
        restarts: source.kubernetes?.pod?.status?.container_statuses?.[0]?.restart_count || 0
      };
    });

    const pods = (await Promise.all(podPromises)).filter(pod => pod !== null);
    res.json(pods);
  } catch (error) {
    console.error('Error fetching pods:', error);
    res.status(500).json({ message: 'Failed to fetch pods', error: error.message });
  }
};

// 獲取特定 Pod 的詳細指標
const getPodMetrics = async (req, res) => {
  try {
    const { podName } = req.params;
    const timeRange = req.query.timeRange || '15m';

    if (!podName) {
      return res.status(400).json({ message: 'Pod name is required' });
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
                  'kubernetes.pod.name.keyword': podName  // Use .keyword for exact match
                }
              }
            ]
          }
        },
        aggs: {
          latest_metrics: {
            top_metrics: {
              metrics: [
                { field: 'kubernetes.pod.memory.usage.bytes' },
                { field: 'kubernetes.pod.memory.available.bytes' },
                { field: 'kubernetes.pod.cpu.usage.nanocores' }
              ],
              sort: {
                '@timestamp': 'desc'
              },
              size: 1
            }
          }
        }
      }
    });

    const latestMetrics = response.body.aggregations.latest_metrics.top[0]?.metrics || {};

    const metrics = {
      memory: {
        used: latestMetrics['kubernetes.pod.memory.usage.bytes'] || 0,
        available: latestMetrics['kubernetes.pod.memory.available.bytes'] || 0
      },
      cpu: {
        cores: (latestMetrics['kubernetes.pod.cpu.usage.nanocores'] || 0) / 1000000000
      }
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching pod metrics:', error);
    res.status(500).json({ message: 'Failed to fetch pod metrics', error: error.message });
  }
};

// 格式化字節大小
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Add new endpoint for calculating selected pods' resources
const calculateSelectedPodsResources = async (req, res) => {
  try {
    const { podNames, namespace } = req.body;
    if (!Array.isArray(podNames) || podNames.length === 0) {
      return res.status(400).json({ message: 'Pod names array is required' });
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
                    gte: 'now-1m'
                  }
                }
              },
              {
                term: {
                  'kubernetes.pod.name': podNames
                }
              },
              {
                term: {
                  'kubernetes.namespace': namespace
                }
              }
            ]
          }
        },
        aggs: {
          total_cpu: {
            sum: {
              field: 'kubernetes.pod.cpu.usage.nanocores'
            }
          },
          total_memory: {
            sum: {
              field: 'kubernetes.pod.memory.usage.bytes'
            }
          }
        }
      }
    });

    const totalResources = {
      memory: {
        used: response.body?.aggregations?.total_memory?.value || 0,
        usedGB: (response.body?.aggregations?.total_memory?.value || 0) / (1024 * 1024 * 1024)
      },
      cpu: {
        cores: (response.body?.aggregations?.total_cpu?.value || 0) / 1000000000
      }
    };

    res.json(totalResources);
  } catch (error) {
    console.error('Error calculating resources:', error);
    res.status(500).json({ message: 'Failed to calculate resources', error: error.message });
  }
};

module.exports = {
  getNamespaces,
  getPods,
  getPodMetrics,
  calculateSelectedPodsResources
};
