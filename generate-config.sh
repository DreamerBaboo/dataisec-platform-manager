#!/bin/sh

# 等待幾秒鐘確保環境變量已經完全加載
sleep 2

# 創建配置目錄（如果不存在）
mkdir -p /app/public

# 始終創建新的配置文件，確保使用最新的環境變量
cat <<EOF > /app/public/config.js
window.RUNTIME_CONFIG = {
  API_BASE_URL: "${VITE_API_BASE_URL}",
  WS_PORT: "${VITE_WS_PORT}",
  NODE_ENV: "${NODE_ENV}",
  LOG_LEVEL: "${REACT_APP_LOG_LEVEL}"
};
console.log('Runtime config loaded:', window.RUNTIME_CONFIG);
EOF

# 確保配置文件存在
if [ ! -f /app/public/config.js ]; then
    echo "Error: Failed to create config.js"
    exit 1
fi

# 在 index.html 中注入配置腳本（如果還沒有注入的話）
if [ -f /app/public/index.html ] && ! grep -q "config.js" /app/public/index.html; then
    sed -i 's|</head>|<script src="/config.js"></script></head>|' /app/public/index.html
fi

# 顯示當前配置（用於調試）
echo "Current config.js content:"
cat /app/public/config.js

# 顯示環境變量（用於調試）
echo "Current environment variables:"
echo "VITE_API_BASE_URL: ${VITE_API_BASE_URL}"
echo "VITE_WS_PORT: ${VITE_WS_PORT}"
echo "NODE_ENV: ${NODE_ENV}"
echo "REACT_APP_LOG_LEVEL: ${REACT_APP_LOG_LEVEL}"

# 啟動 node 服務器
exec node server.js
