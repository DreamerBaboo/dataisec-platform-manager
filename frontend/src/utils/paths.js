/**
 * Utility function to get the correct deployment template path based on environment
 */
export const getDeploymentTemplatePath = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? './app/deploymentTemplate' : './backend/deploymentTemplate';
};