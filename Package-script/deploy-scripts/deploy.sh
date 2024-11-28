#!/bin/bash

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to get user input with default value
get_input() {
    local prompt="$1"
    local default="$2"
    local input
    echo -e "${YELLOW}$prompt (default: $default):${NC}"
    read input
    echo "${input:-$default}"
}

# Function to get yes/no input
get_yes_no() {
    local prompt="$1"
    local input
    while true; do
        echo -e "${YELLOW}$prompt (y/n):${NC}"
        read input
        case $input in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Function to update yaml files
update_yaml() {
    local file="$1"
    local key="$2"
    local value="$3"
    sed -i '' "s|$key:.*|$key: \"$value\"|g" "$file"
}

# Print banner
echo -e "${GREEN}=== Dataisec Platform Deployment Script ===${NC}"
echo

# Create namespace if it doesn't exist
echo -e "\n${GREEN}Ensuring namespace exists...${NC}"
kubectl create namespace dataisec --dry-run=client -o yaml | kubectl apply -f -

# Get configuration values
NODE_NAME=$(get_input "Enter the node name" "192.168.170.126")
OPENSEARCH_URL=$(get_input "Enter the OpenSearch URL" "https://$NODE_NAME:9200")
VITE_API_BASE_URL=$(get_input "Enter the VITE API base URL" "http://$NODE_NAME:30002")

# Persistent volume configuration
echo -e "\n${GREEN}Persistent Volume Configuration${NC}"
PV_SIZE=$(get_input "Enter the persistent volume size (in Gi)" "2")
PV_PATH=$(get_input "Enter the persistent volume path" "/data/dataisec/deployment-templates")

# Update persistent volume size
sed -i '' "s|    storage: .*Gi|    storage: ${PV_SIZE}Gi|g" "single-image-persistent.yaml"
sed -i '' "s|      storage: .*Gi|      storage: ${PV_SIZE}Gi|g" "single-image-persistent.yaml"

# Ask about creating the persistent volume directory
if get_yes_no "Would you like to create the persistent volume directory on the node?"; then
    echo -e "\n${GREEN}Creating persistent volume directory...${NC}"
    if get_yes_no "Do you need sudo privileges to create the directory?"; then
        ssh root@$NODE_NAME "sudo mkdir -p $PV_PATH && sudo chmod 777 $PV_PATH"
    else
        ssh root@$NODE_NAME "mkdir -p $PV_PATH && chmod 777 $PV_PATH"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Successfully created directory $PV_PATH${NC}"
    else
        echo -e "${RED}Failed to create directory. Please create it manually and ensure proper permissions.${NC}"
        if get_yes_no "Would you like to continue with the deployment?"; then
            :
        else
            exit 1
        fi
    fi
fi

# Update ConfigMap
echo -e "\n${GREEN}Updating ConfigMap...${NC}"
update_yaml "configmap.yaml" "  NODE_NAME" "$NODE_NAME"
update_yaml "configmap.yaml" "  OPENSEARCH_URL" "$OPENSEARCH_URL"
update_yaml "configmap.yaml" "  VITE_API_BASE_URL" "$VITE_API_BASE_URL"
update_yaml "configmap.yaml" "  API_BASE_URL" "$VITE_API_BASE_URL"

# Update node affinity in persistent volume
echo -e "\n${GREEN}Updating persistent volume node affinity...${NC}"
sed -i '' "s|          - \".*\"|          - \"$NODE_NAME\"|g" "persistent.yaml"

# Update deployment node selector
echo -e "\n${GREEN}Updating deployment node selector...${NC}"
sed -i '' "s|        kubernetes.io/hostname: \".*\"|        kubernetes.io/hostname: \"$NODE_NAME\"|g" "deployment.yaml"

# Apply Kubernetes configurations
echo -e "\n${GREEN}Applying Kubernetes configurations...${NC}"

echo -e "${YELLOW}Creating persistent volume and claim...${NC}"
kubectl apply -f persistent.yaml -n dataisec

echo -e "${YELLOW}Creating ConfigMap...${NC}"
kubectl apply -f configmap.yaml -n dataisec

echo -e "${YELLOW}Creating RBAC...${NC}"
kubectl apply -f rbac.yaml -n dataisec

echo -e "${YELLOW}Creating secrets...${NC}"
kubectl apply -f secrets.yaml -n dataisec

echo -e "${YELLOW}Creating deployment...${NC}"
kubectl apply -f deployment.yaml -n dataisec

echo -e "${YELLOW}Creating service...${NC}"
kubectl apply -f service.yaml -n dataisec

# Wait for deployment
echo -e "\n${GREEN}Waiting for deployment to be ready...${NC}"
kubectl rollout status deployment/dataisec-platform -n dataisec

# Check deployment status
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Deployment completed successfully!${NC}"
    echo -e "\nAccess the application at: ${YELLOW}$VITE_API_BASE_URL${NC}"
    echo -e "OpenSearch is available at: ${YELLOW}$OPENSEARCH_URL${NC}"
    echo -e "Persistent volume is mounted at: ${YELLOW}$PV_PATH${NC}"
    echo -e "Namespace: ${YELLOW}dataisec${NC}"
else
    echo -e "\n${RED}Deployment failed. Please check the logs using:${NC}"
    echo "kubectl logs -f deployment/dataisec-platform -n dataisec"
fi