#!/bin/bash

# Read configuration from cluster_config.txt
source ../cluster_config.txt

# Check if the required variables are set
if [ -z "$LOCAL_REPOSITORY_IP" ] || [ -z "$LOCAL_REPOSITORY_PORT" ]; then
    echo "Error: LOCAL_REPOSITORY_IP or LOCAL_REPOSITORY_PORT is not set in cluster_config.txt"
    exit 1
fi

# Create metricbeat-values.yaml from the template
sed "s|{REPOSITORY}|$LOCAL_REPOSITORY_IP|g; s|{REPOSITORY_PORT}|$LOCAL_REPOSITORY_PORT|g" metricbeat-template.yaml > metricbeat-values.yaml

# Apply the configuration using kubectl
kubectl apply -f metricbeat-values.yaml

echo "Metricbeat configuration has been applied successfully."
