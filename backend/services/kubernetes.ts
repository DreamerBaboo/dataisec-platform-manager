import * as k8s from '@kubernetes/client-node';
import * as fs from 'fs';

export function createKubernetesClient() {
  try {
    const kc = new k8s.KubeConfig();
    
    console.log('Kubernetes configuration path:', process.env.KUBECONFIG);

    const api = kc.makeApiClient(k8s.CoreV1Api);
    //api.setDefaultTimeout(10000);
    return api;
  } catch (error) {
    console.error('Failed to create Kubernetes client:', error);
    throw error;
  }
}
