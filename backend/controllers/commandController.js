const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const getCommands = async (req, res) => {
  console.log('📥 收到獲取命令請求:', {
    params: req.query,
    headers: req.headers
  });

  try {
    const { name, version } = req.query;

    if (!name || !version) {
      console.warn('❌ 缺少必要參數');
      return res.status(400).json({
        error: 'Missing parameters',
        details: 'Both name and version are required'
      });
    }

    // 構建部署腳本目錄路徑
    const scriptsPath = path.join(__dirname, '..', 'deploymentTemplate', name, 'deploy-scripts');
    console.log('📂 腳本目錄路徑:', scriptsPath);
    
    try {
      // 讀取目錄內容
      const files = await fs.readdir(scriptsPath);
      console.log('📑 找到的文件:', files);
      
      // 過濾出包含版本號的 YAML 文件
      const yamlFiles = files.filter(file => 
        file.includes(version) && 
        (file.endsWith('.yaml') || file.endsWith('.yml'))
      );
      console.log('📄 符合條件的 YAML 文件:', yamlFiles);

      // 定義執行順序
      const executionOrder = [
        'quota',
        'storageclass',
        'persistentvolume',
        'configmap',
        'secret',
        'deployment',
        'service',
        'ingress'
      ];

      // 生成命令
      const commands = yamlFiles
        .sort((a, b) => {
          const typeA = a.split('-')[2]?.toLowerCase() || '';
          const typeB = b.split('-')[2]?.toLowerCase() || '';
          return executionOrder.indexOf(typeA) - executionOrder.indexOf(typeB);
        })
        .map(file => {
          const type = file.split('-')[2]?.toLowerCase();
          const filePath = `./backend/deploymentTemplate/${name}/deploy-scripts/${file}`;
          const command = {
            title: `執行 ${type} 配置`,
            command: `kubectl apply -f ${filePath}`
          };
          console.log('🔧 生成命令:', command);
          return command;
        });

      console.log('📤 返回命令列表:', commands);
      res.json(commands);

    } catch (error) {
      console.error('❌ 讀取目錄失敗:', error);
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: 'Directory not found',
          details: `No deploy-scripts directory found for ${name}`
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ 處理請求失敗:', error);
    res.status(500).json({
      error: 'Failed to generate commands',
      details: error.message
    });
  }
};

const executeCommand = async (req, res) => {
  console.log('📥 收到執行命令請求:', {
    body: req.body,
    headers: req.headers
  });

  const { command } = req.body;
  
  if (!command) {
    console.warn('❌ 缺少命令參數');
    return res.status(400).json({
      error: 'Missing command',
      details: 'Command is required'
    });
  }

  try {
    // 設置工作目錄為專案根目錄
    const workDir = path.join(__dirname, '../..');
    
    console.log('🔧 準備執行命令:', {
      command,
      workDir,
      timestamp: new Date().toISOString()
    });

    // 執行命令
    const { stdout, stderr } = await execAsync(command, {
      cwd: workDir,
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });

    if (stderr) {
      console.warn('⚠️ 命令產生警告:', stderr);
    }

    const output = stdout || stderr;
    console.log('✅ 命令執行成功:', {
      command,
      output,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true,
      output: output 
    });

  } catch (error) {
    console.error('❌ 命令執行失敗:', {
      command,
      error: error.message,
      errorCode: error.code,
      killed: error.killed,
      signal: error.signal,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      error: '命令執行失敗',
      details: error.message,
      command: command,
      errorCode: error.code,
      killed: error.killed,
      signal: error.signal
    });
  }
};

module.exports = {
  getCommands,
  executeCommand
};
