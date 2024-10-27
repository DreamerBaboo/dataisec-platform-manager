// 實現生成假數據的函數
const generateTimeSeries = (count, max) => {
  console.log(`Generating time series with ${count} points and max value ${max}`);
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(Date.now() - (count - i - 1) * 60000).toISOString(),
    value: Math.random() * max
  }));
};

exports.generateSystemMetrics = () => {
  console.log('Generating system metrics');
  const metrics = {
    cluster: {
      cpu: generateTimeSeries(60, 100),
      memory: generateTimeSeries(60, 100),
      network: {
        tx: generateTimeSeries(60, 1000),
        rx: generateTimeSeries(60, 1000)
      },
      storage: {
        used: Math.random() * 500,
        free: Math.random() * 500
      }
    },
    nodes: {
      node1: {
        cpu: generateTimeSeries(60, 100),
        memory: generateTimeSeries(60, 100),
        network: {
          tx: generateTimeSeries(60, 500),
          rx: generateTimeSeries(60, 500)
        },
        storage: {
          used: Math.random() * 250,
          free: Math.random() * 250
        }
      },
      node2: {
        cpu: generateTimeSeries(60, 100),
        memory: generateTimeSeries(60, 100),
        network: {
          tx: generateTimeSeries(60, 500),
          rx: generateTimeSeries(60, 500)
        },
        storage: {
          used: Math.random() * 250,
          free: Math.random() * 250
        }
      }
    }
  };
  console.log('System metrics generated');
  return metrics;
};

exports.generatePodMetrics = () => {
  console.log('Generating pod metrics');
  const generatePodMetric = () => ({
    cpu: generateTimeSeries(60, 100),
    memory: generateTimeSeries(60, 100),
    storage: { used: Math.random() * 500, free: Math.random() * 500 },
    network: {
      tx: generateTimeSeries(60, 1000),
      rx: generateTimeSeries(60, 1000)
    }
  });

  const metrics = {
    'web-pod-1': generatePodMetric(),
    'db-pod-1': generatePodMetric(),
    'monitoring-pod-1': generatePodMetric(),
    'cache-pod-1': generatePodMetric(),
  };
  console.log('Pod metrics generated');
  return metrics;
};

exports.generatePods = () => {
  console.log('Generating pods list');
  const pods = [
    // OpenSearch Pods (StatefulSet)
    {
      metadata: {
        uid: '1',
        name: 'opensearch-master-0',
        namespace: 'opensearch'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'opensearchproject/opensearch:2.11.0',
      cpu: '2000m',
      memory: '4Gi',
      replicas: 1
    },
    {
      metadata: {
        uid: '2',
        name: 'opensearch-master-1',
        namespace: 'opensearch'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'opensearchproject/opensearch:2.11.0',
      cpu: '2000m',
      memory: '4Gi',
      replicas: 1
    },
    {
      metadata: {
        uid: '3',
        name: 'opensearch-master-2',
        namespace: 'opensearch'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'opensearchproject/opensearch:2.11.0',
      cpu: '2000m',
      memory: '4Gi',
      replicas: 1
    },
    {
      metadata: {
        uid: '4',
        name: 'opensearch-data-0',
        namespace: 'opensearch'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'opensearchproject/opensearch:2.11.0',
      cpu: '4000m',
      memory: '8Gi',
      replicas: 1
    },
    {
      metadata: {
        uid: '5',
        name: 'opensearch-data-1',
        namespace: 'opensearch'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'opensearchproject/opensearch:2.11.0',
      cpu: '4000m',
      memory: '8Gi',
      replicas: 1
    },

    // Kafka Pods (StatefulSet)
    {
      metadata: {
        uid: '6',
        name: 'kafka-broker-0',
        namespace: 'kafka'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'confluentinc/cp-kafka:7.4.0',
      cpu: '2000m',
      memory: '4Gi',
      replicas: 1
    },
    {
      metadata: {
        uid: '7',
        name: 'kafka-broker-1',
        namespace: 'kafka'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'confluentinc/cp-kafka:7.4.0',
      cpu: '2000m',
      memory: '4Gi',
      replicas: 1
    },
    {
      metadata: {
        uid: '8',
        name: 'kafka-broker-2',
        namespace: 'kafka'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'confluentinc/cp-kafka:7.4.0',
      cpu: '2000m',
      memory: '4Gi',
      replicas: 1
    },
    {
      metadata: {
        uid: '9',
        name: 'zookeeper-0',
        namespace: 'kafka'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'confluentinc/cp-zookeeper:7.4.0',
      cpu: '1000m',
      memory: '2Gi',
      replicas: 1
    },
    {
      metadata: {
        uid: '10',
        name: 'zookeeper-1',
        namespace: 'kafka'
      },
      type: 'statefulset',
      status: 'Running',
      image: 'confluentinc/cp-zookeeper:7.4.0',
      cpu: '1000m',
      memory: '2Gi',
      replicas: 1
    },

    // Metricbeat Pods (DaemonSet)
    {
      metadata: {
        uid: '11',
        name: 'metricbeat-node1',
        namespace: 'monitoring'
      },
      type: 'daemonset',
      status: 'Running',
      image: 'elastic/metricbeat:8.11.0',
      cpu: '200m',
      memory: '256Mi',
      replicas: 1
    },
    {
      metadata: {
        uid: '12',
        name: 'metricbeat-node2',
        namespace: 'monitoring'
      },
      type: 'daemonset',
      status: 'Running',
      image: 'elastic/metricbeat:8.11.0',
      cpu: '200m',
      memory: '256Mi',
      replicas: 1
    },
    {
      metadata: {
        uid: '13',
        name: 'metricbeat-node3',
        namespace: 'monitoring'
      },
      type: 'daemonset',
      status: 'Running',
      image: 'elastic/metricbeat:8.11.0',
      cpu: '200m',
      memory: '256Mi',
      replicas: 1
    },

    // Decoder Pods (Deployment)
    {
      metadata: {
        uid: '14',
        name: 'decoder-deployment-1',
        namespace: 'decoder'
      },
      type: 'deployment',
      status: 'Running',
      image: 'dataisec/decoder:1.0.0',
      cpu: '1000m',
      memory: '2Gi',
      replicas: 3
    },
    {
      metadata: {
        uid: '15',
        name: 'decoder-deployment-2',
        namespace: 'decoder'
      },
      type: 'deployment',
      status: 'Running',
      image: 'dataisec/decoder:1.0.0',
      cpu: '1000m',
      memory: '2Gi',
      replicas: 3
    },
    {
      metadata: {
        uid: '16',
        name: 'decoder-deployment-3',
        namespace: 'decoder'
      },
      type: 'deployment',
      status: 'Running',
      image: 'dataisec/decoder:1.0.0',
      cpu: '1000m',
      memory: '2Gi',
      replicas: 3
    },
    {
      metadata: {
        uid: '17',
        name: 'decoder-deployment-4',
        namespace: 'decoder'
      },
      type: 'deployment',
      status: 'Running',
      image: 'dataisec/decoder:1.0.0',
      cpu: '1000m',
      memory: '2Gi',
      replicas: 3
    },
    {
      metadata: {
        uid: '18',
        name: 'decoder-deployment-5',
        namespace: 'decoder'
      },
      type: 'deployment',
      status: 'Running',
      image: 'dataisec/decoder:1.0.0',
      cpu: '1000m',
      memory: '2Gi',
      replicas: 3
    },
    {
      metadata: {
        uid: '19',
        name: 'decoder-config',
        namespace: 'decoder'
      },
      type: 'deployment',
      status: 'Running',
      image: 'dataisec/decoder-config:1.0.0',
      cpu: '500m',
      memory: '1Gi',
      replicas: 1
    },
    {
      metadata: {
        uid: '20',
        name: 'decoder-api',
        namespace: 'decoder'
      },
      type: 'deployment',
      status: 'Running',
      image: 'dataisec/decoder-api:1.0.0',
      cpu: '500m',
      memory: '1Gi',
      replicas: 2
    }
  ];
  console.log('Generated pods list:', pods);
  return pods;
};
