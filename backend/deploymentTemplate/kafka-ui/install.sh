#!/bin/bash

# Read configuration from cluster_config.txt (in the parent directory)
source ../cluster_config.txt

# Check if the required variables are set
if [ -z "$LOCAL_REPOSITORY_IP" ] || [ -z "$LOCAL_REPOSITORY_PORT" ]; then
    echo "Error: LOCAL_REPOSITORY_IP or LOCAL_REPOSITORY_PORT is not set in cluster_config.txt"
    exit 1
fi

# Create kafka-ui-values.yaml from the template (in the same directory)
sed "s|{REPOSITORY}|$LOCAL_REPOSITORY_IP|g; s|{REPOSITORY_PORT}|$LOCAL_REPOSITORY_PORT|g" kafka-ui-template.yaml > kafka-ui-values.yaml

# Set the namespace for the Kafka UI
NAMESPACE="kafka"

# Set the path to your local Helm chart (current directory)
LOCAL_CHART_PATH="."

# Check if the namespace exists, if not create it
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    kubectl create namespace "$NAMESPACE"
    echo "Namespace $NAMESPACE created."
else
    echo "Namespace $NAMESPACE already exists."
fi

# Deploy or upgrade the Kafka UI using Helm with the local chart
helm upgrade --install kafka-ui "$LOCAL_CHART_PATH" \
    --namespace "$NAMESPACE" \
    -f kafka-ui-values.yaml

echo "Kafka UI has been deployed/upgraded successfully using the local Helm chart in the '$NAMESPACE' namespace."
