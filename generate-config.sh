#!/bin/sh

# 等待幾秒鐘確保環境變量已經完全加載
sleep 2

# 創建運行時配置文件
cat <<EOF > /app/public/config.js
window.RUNTIME_CONFIG = {
  API_BASE_URL: '${VITE_API_BASE_URL:-http://localhost:3001}',
  WS_PORT: '${VITE_WS_PORT:-3001}',
  NODE_ENV: '${NODE_ENV:-production}',
  LOG_LEVEL: '${REACT_APP_LOG_LEVEL:-info}'
};
console.log('Runtime config loaded:', window.RUNTIME_CONFIG);
EOF

# 檢查配置文件是否成功創建
if [ ! -f /app/public/config.js ]; then
    echo "Error: Failed to create config.js"
    exit 1
fi

# 顯示生成的配置內容（用於調試）
echo "Generated config.js content:"
cat /app/public/config.js

# 在 index.html 中注入配置腳本（如果還沒有注入的話）
if ! grep -q "config.js" /app/public/index.html; then
    sed -i 's|</head>|<script src="/config.js"></script></head>|' /app/public/index.html
fi

# 顯示環境變量（用於調試）
echo "Current environment variables:"
echo "VITE_API_BASE_URL: ${VITE_API_BASE_URL}"
echo "VITE_WS_PORT: ${VITE_WS_PORT}"
echo "NODE_ENV: ${NODE_ENV}"
echo "REACT_APP_LOG_LEVEL: ${REACT_APP_LOG_LEVEL}"

# 啟動 node 服務器
exec node server.js
