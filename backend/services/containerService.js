const k8sService = require('./k8sService');

class ContainerService {
  async listRepositories() {
    try {
      const namespaces = await k8sService.getNamespaces();
      const repositories = new Set();
      
      for (const ns of namespaces) {
        const deployments = await k8sService.listDeployments(ns.name);
        deployments.items.forEach(deployment => {
          deployment.spec.template.spec.containers.forEach(container => {
            const [repo] = container.image.split(':');
            repositories.add(repo);
          });
        });
      }

      return Array.from(repositories);
    } catch (error) {
      console.error('Failed to list repositories:', error);
      throw error;
    }
  }

  async listTags(repository) {
    try {
      console.log(`Fetching tags for repository: ${repository}`);
      const namespaces = await k8sService.getNamespaces();
      const tags = new Set();

      for (const ns of namespaces) {
        const deployments = await k8sService.listDeployments(ns.name);
        deployments.items.forEach(deployment => {
          deployment.spec.template.spec.containers.forEach(container => {
            const [repo, tag] = container.image.split(':');
            if (repo === repository && tag) {
              tags.add(tag);
            }
          });
        });
      }

      return Array.from(tags);
    } catch (error) {
      console.error(`Failed to list tags for ${repository}:`, error);
      throw error;
    }
  }

  async searchImages(term) {
    try {
      const namespaces = await k8sService.getNamespaces();
      const images = new Set();

      for (const ns of namespaces) {
        const deployments = await k8sService.listDeployments(ns.name);
        deployments.items.forEach(deployment => {
          deployment.spec.template.spec.containers.forEach(container => {
            if (container.image.includes(term)) {
              images.add(container.image);
            }
          });
        });
      }

      return Array.from(images);
    } catch (error) {
      console.error('Failed to search images:', error);
      throw error;
    }
  }

  async listContainers() {
    try {
      const namespaces = await k8sService.getNamespaces();
      const containers = [];

      for (const ns of namespaces) {
        const deployments = await k8sService.listDeployments(ns.name);
        deployments.items.forEach(deployment => {
          deployment.spec.template.spec.containers.forEach(container => {
            containers.push({
              name: container.name,
              image: container.image,
              deploymentName: deployment.metadata.name,
              namespace: deployment.metadata.namespace,
              status: deployment.status.availableReplicas > 0 ? 'Running' : 'Not Running'
            });
          });
        });
      }

      return containers;
    } catch (error) {
      console.error('Failed to list containers:', error);
      throw error;
    }
  }

  async inspectContainer(namespace, deploymentName, containerName) {
    try {
      const deployment = await k8sService.getDeployment(deploymentName, namespace);
      const container = deployment.spec.template.spec.containers.find(c => c.name === containerName);
      
      if (!container) {
        throw new Error(`Container ${containerName} not found in deployment ${deploymentName}`);
      }

      const status = await k8sService.getDeploymentStatus(deploymentName, namespace);

      return {
        name: container.name,
        image: container.image,
        status: status,
        resources: container.resources,
        volumeMounts: container.volumeMounts,
        env: container.env
      };
    } catch (error) {
      console.error('Failed to inspect container:', error);
      throw error;
    }
  }
}

module.exports = new ContainerService();
