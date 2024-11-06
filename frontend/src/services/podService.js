import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const podService = {
  // Get pods
  async getPods(namespace = '') {
    try {
      const response = await axios.get(`${API_URL}/api/pods${namespace ? `?namespace=${namespace}` : ''}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get pods:', error);
      throw error;
    }
  },

  // Get namespaces
  async getNamespaces() {
    try {
      const response = await axios.get(`${API_URL}/api/pods/namespaces`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get namespaces:', error);
      throw error;
    }
  },

  // Delete pod
  async deletePod(name, namespace) {
    try {
      const response = await axios.delete(`${API_URL}/api/pods/${name}?namespace=${namespace}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to delete pod:', error);
      throw error;
    }
  },

  // Get pod metrics
  async getPodMetrics(name, namespace) {
    try {
      const response = await axios.get(
        `${API_URL}/api/pods/${name}/metrics`, {
          params: { namespace },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get pod metrics:', error);
      throw error;
    }
  },

  // Calculate pod resources
  async calculatePodResources(podName, namespace, timeRange = '15m') {
    try {
      console.log('Calculating resources for:', { podName, namespace, timeRange });
      
      const response = await axios.post(
        `${API_URL}/api/pods/calculate-resources`,
        { podName, namespace, timeRange },
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Resource calculation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to calculate pod resources:', error);
      throw error;
    }
  },

  // Get pod logs
  async getPodLogs(name, namespace, options = {}) {
    try {
      const response = await axios.get(
        `${API_URL}/api/pods/${name}/logs`, {
          params: { 
            namespace,
            ...options
          },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get pod logs:', error);
      throw error;
    }
  }
};

export default podService; 