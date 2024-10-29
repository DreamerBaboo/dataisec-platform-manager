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
        metrics: {
          cpu: source.kubernetes?.pod?.cpu?.usage?.nanocores 
            ? (source.kubernetes.pod.cpu.usage.nanocores / 1000000000) 
            : 0,
          memory: source.kubernetes?.pod?.memory?.usage?.bytes || 0
        },
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
    const { podName, timeRange = '15m' } = req.query;

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
              }
            }
          }
        }
      }
    });

    const buckets = response.body.aggregations.time_buckets.buckets;
    const metrics = {
      cpu: buckets.map(bucket => ({
        timestamp: bucket.key_as_string,
        value: (bucket.cpu_usage.value || 0) / 1000000000,
        display: `${((bucket.cpu_usage.value || 0) / 1000000000).toFixed(2)} cores`
      })),
      memory: buckets.map(bucket => ({
        timestamp: bucket.key_as_string,
        value: bucket.memory_usage.value || 0,
        display: formatBytes(bucket.memory_usage.value || 0)
      }))
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

module.exports = {
  getNamespaces,
  getPods,
  getPodMetrics
};
