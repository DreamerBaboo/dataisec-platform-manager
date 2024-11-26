router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin || 'unknown',
    host: req.headers.host,
    environment: process.env.NODE_ENV,
    kubernetes: {
      namespace: process.env.KUBERNETES_NAMESPACE,
      podName: process.env.KUBERNETES_POD_NAME
    }
  });
});