const fakeDataGenerator = require('../utils/fakeDataGenerator');

exports.getSystemMetrics = (req, res) => {
  console.log('Received request for system metrics');
  const fakeData = fakeDataGenerator.generateSystemMetrics();
  console.log('Generated system metrics:', JSON.stringify(fakeData, null, 2));
  console.log('Sending response for system metrics');
  res.json(fakeData);
};

exports.getPodMetrics = (req, res) => {
  console.log('Received request for pod metrics');
  const allPodsMetrics = {};
  
  // 獲取所有 Pod 的列表
  const pods = fakeDataGenerator.generatePods();
  
  // 為每個 Pod 生成指標
  pods.forEach(pod => {
    allPodsMetrics[pod.metadata.name] = fakeDataGenerator.generatePodMetrics(pod.metadata.name);
  });

  console.log('Generated metrics for all pods');
  res.json(allPodsMetrics);
};

exports.getPods = (req, res) => {
  console.log('Received request for pods');
  const fakePods = fakeDataGenerator.generatePods();
  console.log('Generated pods:', JSON.stringify(fakePods, null, 2));
  console.log('Sending response for pods');
  res.json(fakePods);
};
