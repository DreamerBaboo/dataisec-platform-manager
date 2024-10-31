const { Client } = require('@opensearch-project/opensearch');

const client = new Client({
  node: process.env.OPENSEARCH_ENDPOINT,
  auth: {
    username: process.env.OPENSEARCH_USERNAME,
    password: process.env.OPENSEARCH_PASSWORD
  },
  ssl: {
    rejectUnauthorized: false // 在生產環境中應該設置為 true，並提供適當的 SSL 證書
  }
});

// 測試連接並驗證索引
const testConnection = async () => {
  try {
    // 測試基本連接
    const healthResponse = await client.cluster.health();
    console.log('Successfully connected to OpenSearch:', healthResponse);

    // 檢查 Metricbeat 索引是否存在
    const catResponse = await client.cat.indices({ 
      format: 'json',
      index: process.env.OPENSEARCH_SYSTEM_METRICS_INDEX 
    });
    
    if (catResponse.body.length === 0) {
      console.warn('Warning: No Metricbeat indices found');
      return false;
    }

    console.log('Found Metricbeat indices:', 
      catResponse.body.map(index => index.index).join(', ')
    );

    return true;
  } catch (error) {
    console.error('Failed to connect to OpenSearch or verify indices:', error);
    return false;
  }
};

// 獲取系統指標
const getSystemMetrics = async (timeRange = '15m') => {
  try {
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
                  'metricset.name': 'cpu'
                }
              }
            ]
          }
        },
        aggs: {
          cpu_usage: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1m'
            },
            aggs: {
              cpu_pct: {
                avg: {
                  field: 'system.cpu.total.pct'
                }
              }
            }
          }
        }
      }
    });

    return response.body.aggregations;
  } catch (error) {
    console.error('Failed to fetch system metrics:', error);
    throw error;
  }
};

// 獲取 Pod 指標
const getPodMetrics = async (podName, timeRange = '15m') => {
  try {
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
          cpu_usage: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1m'
            },
            aggs: {
              cpu_pct: {
                avg: {
                  field: 'kubernetes.pod.cpu.usage.nanocores'
                }
              }
            }
          },
          memory_usage: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1m'
            },
            aggs: {
              memory_bytes: {
                avg: {
                  field: 'kubernetes.pod.memory.usage.bytes'
                }
              }
            }
          },
          network_in: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1m'
            },
            aggs: {
              bytes: {
                avg: {
                  field: 'kubernetes.pod.network.rx.bytes'
                }
              }
            }
          },
          network_out: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1m'
            },
            aggs: {
              bytes: {
                avg: {
                  field: 'kubernetes.pod.network.tx.bytes'
                }
              }
            }
          }
        }
      }
    });

    return response.body.aggregations;
  } catch (error) {
    console.error('Failed to fetch pod metrics:', error);
    throw error;
  }
};

// 獲取系統日誌
const getSystemLogs = async (timeRange = '15m', query = '*') => {
  try {
    const response = await client.search({
      index: process.env.OPENSEARCH_LOGS_INDEX,
      body: {
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
                query_string: {
                  query: query
                }
              }
            ]
          }
        },
        sort: [
          {
            '@timestamp': {
              order: 'desc'
            }
          }
        ]
      }
    });

    return response.body.hits.hits;
  } catch (error) {
    console.error('Failed to fetch system logs:', error);
    throw error;
  }
};

module.exports = {
  client,
  testConnection,
  getSystemMetrics,
  getPodMetrics,
  getSystemLogs
};
