#!/bin/bash

# 構建 Docker 映像
docker build -t dataisec/backend:latest ./backend
docker build -t dataisec/frontend:latest ./frontend

# 推送到 Docker Registry（如果需要）
# docker push dataisec/backend:latest
# docker push dataisec/frontend:latest

# 部署到 Kubernetes
helm upgrade --install dataisec-platform ./k8s/dataisec-platform \
  --namespace dataisec \
  --create-namespace \
  --values ./k8s/dataisec-platform/values.yaml 