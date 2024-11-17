import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';

export function createKubernetesClient() {
  try {
    const kc = new k8s.KubeConfig();
    
    console.log('Kubernetes configuration path:', process.env.KUBECONFIG);
    
    if (fs.existsSync(process.env.KUBECONFIG)) {
      console.log('Loading config from file');
      kc.loadFromFile(process.env.KUBECONFIG);
    } else {
      console.log('Attempting to load from default locations');
      kc.loadFromDefault();
    }

    const cluster = kc.getCurrentCluster();
    console.log('Current cluster:', {
      name: cluster?.name,
      server: cluster?.server,
      skipTLSVerify: cluster?.skipTLSVerify
    });

    const api = kc.makeApiClient(k8s.CoreV1Api);
    
    // 設置較長的超時時間用於調試
    api.setDefaultTimeout(10000);
    
    return api;
  } catch (error) {
    console.error('Failed to create Kubernetes client:', error);
    throw error;
  }
}
