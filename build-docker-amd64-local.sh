#!/bin/bash

# 檢查 Docker Buildx 是否可用
if ! docker buildx version &> /dev/null; then
  echo "Docker Buildx 未安裝或不可用。請安裝 Docker Buildx 並重試。"
  exit 1
fi

# 設置默認映像名稱和標籤
IMAGE_NAME="dataisec-platform"
IMAGE_TAG="0.2.1"

# 構建多平台映像
docker buildx build --platform linux/amd64,linux -t $IMAGE_NAME:$IMAGE_TAG --load .
docker save -o $IMAGE_NAME-$IMAGE_TAG.tar $IMAGE_NAME:$IMAGE_TAG
