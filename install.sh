#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

# Check for required tools
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}kubectl is required but not installed.${NC}" >&2; exit 1; }
command -v oc >/dev/null 2>&1 || { echo -e "${RED}OpenShift CLI (oc) is required but not installed.${NC}" >&2; exit 1; }

# Create temporary directory
TEMP_DIR=$(mktemp -d)
tar xzf package.tar.gz -C "$TEMP_DIR"

# Source configuration
source "$TEMP_DIR/config.env"

echo -e "${GREEN}Starting deployment...${NC}"

# Create namespace if it doesn't exist
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Apply RBAC
kubectl apply -f "$TEMP_DIR/k8s/single-image-rbac.yaml" -n ${NAMESPACE}

# Apply ConfigMap
kubectl apply -f "$TEMP_DIR/k8s/single-image-configmap.yaml" -n ${NAMESPACE}

# Apply Secrets
kubectl apply -f "$TEMP_DIR/k8s/single-image-secrets.yaml" -n ${NAMESPACE}

# Apply PVC
kubectl apply -f "$TEMP_DIR/k8s/single-image-persistent.yaml" -n ${NAMESPACE}

# Apply Deployment
kubectl apply -f "$TEMP_DIR/k8s/single-image-deployment.yaml" -n ${NAMESPACE}

# Apply Service
kubectl apply -f "$TEMP_DIR/k8s/single-image-service.yaml" -n ${NAMESPACE}

echo -e "${GREEN}Waiting for deployment to be ready...${NC}"
kubectl rollout status deployment/dataisec-platform -n ${NAMESPACE}

# Clean up
rm -rf "$TEMP_DIR"

echo -e "${GREEN}Installation completed successfully!${NC}"
echo "You can check the status of your deployment using:"
echo "kubectl get pods -n ${NAMESPACE}"
