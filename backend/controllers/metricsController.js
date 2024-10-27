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
  const fakeData = fakeDataGenerator.generatePodMetrics();
  console.log('Generated pod metrics:', JSON.stringify(fakeData, null, 2));
  console.log('Sending response for pod metrics');
  res.json(fakeData);
};

exports.getPods = (req, res) => {
  console.log('Received request for pods');
  const fakePods = fakeDataGenerator.generatePods();
  console.log('Generated pods:', JSON.stringify(fakePods, null, 2));
  console.log('Sending response for pods');
  res.json(fakePods);
};
