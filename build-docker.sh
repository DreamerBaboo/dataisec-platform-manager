#!/bin/bash

# 構建映像
docker build -t dataisec-pod-management:latest .

# 標記映像（如果需要推送到倉庫）
docker tag dataisec-pod-management:latest your-registry/dataisec-pod-management:latest

# 推送映像
docker push your-registry/dataisec-pod-management:latest