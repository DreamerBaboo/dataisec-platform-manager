const { KubernetesService } = require('./dist/index');
const k8sService = new KubernetesService();

module.exports = {
  k8sService,
  KubernetesService
}; 