/**
 * Utility function to get the correct deployment template path based on environment
 */
export const getDeploymentTemplatePath = () => {
  // Always use relative path from the backend's perspective
  return './deploymentTemplate';
};