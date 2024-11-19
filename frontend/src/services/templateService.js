import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL;

export const templateService = {
  // Get list of available templates
  async getTemplateList() {
    try {
      const response = await axios.get(`${API_URL}/api/pod-deployments/templates/list`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get template list:', error);
      throw error;
    }
  },

  // Upload template
  async uploadTemplate(deploymentName, file) {
    try {
      const formData = new FormData();
      formData.append('template', file);
      formData.append('deploymentName', deploymentName);

      console.log('Upload request details:', {
        fileName: file.name,
        deploymentName: deploymentName,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          value: value instanceof File ? value.name : value
        }))
      });

      const response = await axios.post(
        `${API_URL}/api/pod-deployments/templates/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to upload template:', error);
      throw error;
    }
  },

  // Get template configuration
  async getTemplateConfig(deploymentName) {
    try {
      const response = await axios.get(
        `${API_URL}/api/pod-deployments/templates/${deploymentName}/config`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get template config:', error);
      throw error;
    }
  },

  // Save template content
  async saveTemplateContent(deploymentName, content) {
    try {
      console.log('Saving template content:', {
        deploymentName,
        contentLength: content.length,
        contentPreview: content.substring(0, 100)
      });

      const response = await axios.post(
        `${API_URL}/api/pod-deployments/templates/${deploymentName}/template`,
        { content },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Save response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to save template content:', error);
      throw error;
    }
  },

  // Get template placeholders
  async getTemplatePlaceholders(deploymentName) {
    try {
      console.log('Getting placeholders for deployment:', deploymentName);
      const response = await axios.get(
        `${API_URL}/api/pod-deployment/templates/${deploymentName}/placeholders`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      console.log('Placeholders response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get template placeholders:', error);
      throw error;
    }
  },

  // Extract values from final YAML
  async extractValuesFromFinal(templateYaml, finalYaml) {
    try {
      const response = await axios.post(
        `${API_URL}/api/pod-deployments/templates/extract-values`,
        {
          templateYaml,
          finalYaml
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to extract values:', error);
      throw error;
    }
  },

  async saveTemplateConfig(deploymentName, data) {
    try {
      const response = await axios.post(
        `${API_URL}/api/pod-deployment/templates/${deploymentName}/config`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to save template config:', error);
      throw error;
    }
  }
};

export default templateService; 