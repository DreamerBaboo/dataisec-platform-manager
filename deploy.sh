#!/bin/bash

docker stop dataisec-pod-management
docker rm dataisec-pod-management

# 重新構建映像
docker build -t dataisec-pod-management:latest .

# 運行新容器

docker run -v /var/run/docker.sock:/var/run/docker.sock -v ~/.kube/config:/app/.kube/config -p 3001:3001 --user root -it dataisec-pod-management:latest

# docker run -d \
#   --name dataisec-pod-management \
#   -p 3001:3001 \
#   -v "${HOME}/.kube/config:/app/.kube/config:ro" \
#  dataisec-pod-management:latest