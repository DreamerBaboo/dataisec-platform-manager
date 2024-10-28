const fakeDataGenerator = require('../utils/fakeDataGenerator');
const { exec } = require('child_process');
const fs = require('fs').promises;

exports.getPods = (req, res) => {
  console.log('Received request for pods list');
  const pods = fakeDataGenerator.generatePods();
  console.log('Generated pods list:', pods);
  res.json(pods);
};

exports.getPodById = (req, res) => {
  console.log('Received request for pod details:', req.params.id);
  const pods = fakeDataGenerator.generatePods();
  const pod = pods.find(p => p.metadata.uid === req.params.id);
  
  if (!pod) {
    console.log('Pod not found:', req.params.id);
    return res.status(404).json({ message: 'Pod not found' });
  }

  console.log('Returning pod details:', pod);
  res.json(pod);
};

exports.createPod = (req, res) => {
  console.log('Received create pod request:', req.body);
  // 在實際應用中，這裡會調用 Kubernetes API 來創建 Pod
  const newPod = {
    metadata: {
      uid: Date.now().toString(),
      name: req.body.name,
      namespace: req.body.namespace
    },
    type: req.body.type,
    image: req.body.image,
    cpu: req.body.cpu,
    memory: req.body.memory,
    replicas: req.body.replicas,
    status: 'Pending'
  };
  console.log('Created new pod:', newPod);
  res.status(201).json(newPod);
};

exports.updatePod = (req, res) => {
  console.log('Received update pod request:', req.params.id, req.body);
  // 在實際應用中，這裡會調用 Kubernetes API 來更新 Pod
  const updatedPod = {
    metadata: {
      uid: req.params.id,
      name: req.body.name,
      namespace: req.body.namespace
    },
    type: req.body.type,
    image: req.body.image,
    cpu: req.body.cpu,
    memory: req.body.memory,
    replicas: req.body.replicas,
    status: 'Running'
  };
  console.log('Updated pod:', updatedPod);
  res.json(updatedPod);
};

exports.deletePods = (req, res) => {
  console.log('Received delete pods request:', req.body.podIds);
  // 在實際應用中，這裡會調用 Kubernetes API 來刪除 Pod
  console.log('Pods deleted:', req.body.podIds);
  res.json({ message: 'Pods deleted successfully', deletedPods: req.body.podIds });
};

exports.uploadImage = async (req, res) => {
  console.log('Received image upload request');
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const { path: filePath, originalname } = req.file;
    console.log('File uploaded:', { filePath, originalname });

    // 執行 Docker 命令
    const dockerCommand = `docker load -i ${filePath}`;
    exec(dockerCommand, async (error, stdout, stderr) => {
      try {
        // 刪除臨時文件
        await fs.unlink(filePath);

        if (error) {
          console.error('Docker command error:', error);
          return res.status(500).json({ message: 'Failed to load Docker image', error: error.message });
        }

        console.log('Docker command output:', stdout);
        res.json({ 
          message: 'Image uploaded and loaded successfully',
          output: stdout
        });
      } catch (unlinkError) {
        console.error('Failed to delete temporary file:', unlinkError);
        res.status(500).json({ message: 'Failed to clean up temporary file' });
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

exports.getPodMetrics = (req, res) => {
  const { podName } = req.query;
  console.log('Received request for pod metrics:', podName);
  
  if (!podName) {
    return res.status(400).json({ message: 'Pod name is required' });
  }

  const metrics = fakeDataGenerator.generatePodMetrics(podName);
  console.log('Generated pod metrics:', metrics);
  res.json(metrics);
};
