#!/bin/bash

# 部署單一映像
echo "部署單一映像..."

# 創建命名空間
kubectl create namespace dataisec || echo "命名空間已存在"

# 部署 RBAC
kubectl apply -f ./single-image-rbac.yaml -n dataisec

# 部署 ConfigMap
kubectl apply -f ./single-image-configmap.yaml -n dataisec

# 部署秘密
kubectl apply -f ./single-image-secrets.yaml -n dataisec

# 部署單一映像
kubectl apply -f ./single-image-deployment.yaml -n dataisec

# 部署服務
kubectl apply -f ./single-image-service.yaml -n dataisec




echo "單一映像部署完成！"
