const fakeDataGenerator = require('../utils/fakeDataGenerator');

exports.getPods = (req, res) => {
  const fakePods = fakeDataGenerator.generatePods();
  res.json(fakePods);
};

exports.createPod = (req, res) => {
  // 實現創建 Pod 的邏輯
  res.status(201).json({ message: 'Pod 創建成功', podName: req.body.name });
};
