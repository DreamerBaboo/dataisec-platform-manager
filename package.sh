#!/bin/bash

# Create config.env
cat > config.env << EOL
NAMESPACE=dataisec-platform
IMAGE_REGISTRY=your-registry
IMAGE_TAG=latest
EOL

# Create the package
tar czf package.tar.gz \
    k8s/* \
    config.env \
    install.sh

echo "Installation package created: package.tar.gz"
echo "To install, copy package.tar.gz to your RedHat server and run:"
echo "  1. tar xzf package.tar.gz"
echo "  2. sudo ./install.sh"
