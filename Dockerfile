# 構建階段 - 前端
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# 複製前端 package.json
COPY frontend/package*.json ./

# 安裝前端依賴
RUN npm install

# 複製前端源代碼
COPY frontend/ ./

# 設置環境變量
ENV NODE_ENV=production

# 構建前端
RUN npm run build

# 構建階段 - 後端
FROM node:18-alpine as backend-builder

WORKDIR /app/backend

# 複製後端 package.json
COPY backend/package*.json ./

# 安裝後端依賴
RUN npm install --production

# 複製後端源代碼
COPY backend/ ./

# 創建 public 目錄
RUN mkdir -p public

# 最終階段
FROM node:18-alpine

WORKDIR /app

# 複製後端文件
COPY --from=backend-builder /app/backend ./

# 創建 public 目錄並複製前端構建文件
RUN mkdir -p public
COPY --from=frontend-builder /app/frontend/dist/* ./public/

# 修正資源路徑
RUN cd public && \
    if [ -d "assets" ]; then \
      mv assets/* . && \
      rmdir assets && \
      sed -i 's|/assets/|/|g' index.html; \
    fi

# 創建必要的目錄
RUN mkdir -p /app/.kube \
    && chown -R node:node /app

# 切換到非 root 用戶
USER node

# 設置環境變量
ENV NODE_ENV=production \
    PORT=3001 \
    # OpenSearch Configuration
    OPENSEARCH_URL=http://localhost:9200 \
    OPENSEARCH_HOST=localhost \
    OPENSEARCH_PORT=9200 \
    OPENSEARCH_USERNAME=admin \
    OPENSEARCH_PASSWORD=Cobr@8029@@123D \
    OPENSEARCH_POD_METRICS_INDEX=metricbeat-* \
    OPENSEARCH_SYSTEM_METRICS_INDEX=metricbeat-* \
    OPENSEARCH_LOGS_INDEX=filebeat-* \
    OPENSEARCH_TEMPLATE_INDEX=pod-deployment-templates \
    OPENSEARCH_DEPLOYMENT_LOG_INDEX=pod-deployment-logs \
    OPENSEARCH_AUDIT_LOG_INDEX=pod-deployment-audit \
    # JWT Configuration
    JWT_SECRET=your_jwt_secret \
    JWT_EXPIRES_IN=24h \
    # Kubernetes Configuration
    KUBECONFIG=/app/.kube/config \
    # Logging Configuration
    LOG_LEVEL=info \
    LOG_FORMAT=json \
    # WebSocket Configuration
    WS_HEARTBEAT_INTERVAL=30000

EXPOSE 3001

# 創建掛載點
VOLUME ["/app/.kube"]

CMD ["node", "server.js"]
