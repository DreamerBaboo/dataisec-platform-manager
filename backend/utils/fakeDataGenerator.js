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
    pod1: generatePodMetric(),
    pod2: generatePodMetric(),
    pod3: generatePodMetric(),
    // 添加更多 Pod
  };
  console.log('Pod metrics generated');
  return metrics;
};

exports.generatePods = () => {
  console.log('Generating pods list');
  const pods = [
    { id: '1', metadata: { uid: '1', name: 'pod1', namespace: 'default' }, type: 'deployment' },
    { id: '2', metadata: { uid: '2', name: 'pod2', namespace: 'kube-system' }, type: 'statefulset' },
    { id: '3', metadata: { uid: '3', name: 'pod3', namespace: 'default' }, type: 'daemonset' },
    // 添加更多 Pod
  ];
  console.log('Pods list generated');
  return pods;
};
