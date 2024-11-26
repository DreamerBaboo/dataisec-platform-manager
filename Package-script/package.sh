#!/bin/bash

# Create config.env
cat > config.env << EOL
NAMESPACE=dataisec
IMAGE_REGISTRY=dataisec-platform
IMAGE_TAG=0.2.0
EOL

# Create the package
tar czf package.tar.gz \
    deploy-scripts/* \
    config.env \
    dataisec-platform.tar \
    install.sh

echo "Installation package created: package.tar.gz"
echo "To install, copy package.tar.gz to your RedHat server and run:"
echo "  1. tar xzf package.tar.gz"
echo "  2. sudo ./install.sh"
