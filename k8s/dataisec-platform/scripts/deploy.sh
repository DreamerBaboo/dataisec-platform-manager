#!/bin/bash

# Set default variables
NAMESPACE="dataisec"
RELEASE_NAME="dataisec-platform"
STORAGE_PATH=""
NODE_NAME=""

# Display usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -n, --namespace    Specify namespace (default: dataisec)"
    echo "  -r, --release      Specify release name (default: dataisec-platform)"
    echo "  -p, --path         Specify storage path (required)"
    echo "  -d, --node         Specify node name for deployment (required)"
    echo "  -h, --help         Display this help message"
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -n|--namespace)
            NAMESPACE="$2"
            shift
            shift
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift
            shift
            ;;
        -p|--path)
            STORAGE_PATH="$2"
            shift
            shift
            ;;
        -d|--node)
            NODE_NAME="$2"
            shift
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Check required parameters
if [ -z "$STORAGE_PATH" ] || [ -z "$NODE_NAME" ]; then
    echo "Error: Storage path and node name must be specified (-p or --path, -d or --node)"
    usage
fi

# Change to the parent directory
cd "$(dirname "$0")/.." || {
    echo "Error: Unable to change to the correct directory"
    exit 1
}

# Check if values.yaml exists
if [ ! -f "values.yaml" ]; then
    echo "Error: values.yaml file does not exist in the current directory"
    exit 1
fi

# Create namespace (if it does not exist)
echo "Creating namespace: $NAMESPACE"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Check and delete old RBAC resources
echo "Cleaning up old RBAC resources..."
kubectl delete serviceaccount -n $NAMESPACE dataisec-backend-sa --ignore-not-found
kubectl delete clusterrole dataisec-backend-role --ignore-not-found
kubectl delete clusterrolebinding dataisec-backend-role-binding --ignore-not-found

# Create storage directories
echo "Creating storage directories: $STORAGE_PATH"
mkdir -p "$STORAGE_PATH/backend"
mkdir -p "$STORAGE_PATH/templates"

# Set directory permissions
echo "Setting directory permissions..."
chmod -R 777 "$STORAGE_PATH"

# Check if PV exists
echo "Checking persistent volumes..."
if ! kubectl get pv ${RELEASE_NAME}-pv &> /dev/null; then
    echo "Creating persistent volume..."
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ${RELEASE_NAME}-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: ${STORAGE_PATH}/backend
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - ${NODE_NAME}
EOF

    echo "Creating template persistent volume..."
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ${RELEASE_NAME}-templates-pv
spec:
  capacity:
    storage: 1Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: ${STORAGE_PATH}/templates
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - ${NODE_NAME}
EOF
fi

# Add node label
echo "Adding node label..."
kubectl label nodes ${NODE_NAME} storage=local --overwrite

# Modify deployment configuration to add nodeSelector
cat <<EOF > values-override.yaml
backend:
  nodeSelector:
    kubernetes.io/hostname: ${NODE_NAME}
EOF

# Install/upgrade Helm chart
echo "Deploying application..."
helm upgrade --install $RELEASE_NAME . \
  --namespace $NAMESPACE \
  --create-namespace \
  --wait \
  --timeout 10m \
  --values values.yaml \
  --values values-override.yaml \
  --set global.releaseName=$RELEASE_NAME \
  --set global.namespace=$NAMESPACE \
  --set persistence.path=$STORAGE_PATH

# Check deployment status
echo "Checking deployment status..."
echo "Waiting for Pods to be ready..."
kubectl wait --for=condition=ready pod -l app=dataisec-backend -n $NAMESPACE --timeout=300s || {
    echo "Error: Pods failed to become ready within the specified time"
    kubectl get pods -n $NAMESPACE
    kubectl describe pods -n $NAMESPACE -l app=dataisec-backend
    exit 1
}

echo -e "\nDeployment status:"
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE

# Wait for Ingress to be ready
echo -e "\nWaiting for Ingress to be ready..."
sleep 10

# Get Ingress information
echo -e "\nApplication access information:"
INGRESS_NAME="${RELEASE_NAME}-ingress"

# Get hostname from values.yaml
HOST_NAME="dataisec.local"  # Default value defined in values.yaml

# Check Ingress status
if kubectl get ingress -n $NAMESPACE $INGRESS_NAME &> /dev/null; then
    echo -e "\nAccess configuration:"
    echo "1. Edit the hosts file:"
    echo "   sudo vi /etc/hosts"
    
    # Try to get Ingress IP
    INGRESS_IP=$(kubectl get ingress -n $NAMESPACE $INGRESS_NAME -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    
    if [ -n "$INGRESS_IP" ]; then
        echo "2. Add the following mapping:"
        echo "   $INGRESS_IP $HOST_NAME"
    else
        echo "2. Get the cluster IP:"
        echo "   - If using minikube:"
        echo "     minikube ip"
        echo "   - If using another environment, check the external IP of the Ingress Controller:"
        echo "     kubectl get svc -n ingress-nginx"
        echo "   Then add the obtained IP to the hosts file:"
        echo "   <YOUR_CLUSTER_IP> $HOST_NAME"
    fi
    
    echo -e "\n3. Application access URLs:"
    echo "   Frontend: http://$HOST_NAME"
    echo "   API: http://$HOST_NAME/api"
fi
