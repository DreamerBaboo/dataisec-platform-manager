#!/bin/bash

docker stop dataisec-pod-management
docker rm dataisec-pod-management

# 重新構建映像
docker build -t dataisec-pod-management:latest .

# 運行新容器
docker run -d \
  --name dataisec-pod-management \
  -p 3001:3001 \
  -v "${HOME}/.kube/config:/app/.kube/config:ro" \
  dataisec-pod-management:latest