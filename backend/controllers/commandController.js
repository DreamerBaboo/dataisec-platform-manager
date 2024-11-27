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

    // 讀取 config.json 獲取命名空間
    const configPath = path.join(__dirname, '..', 'deploymentTemplate', name, 'config.json');
    let namespace = 'default'; // 默認命名空間
    
    try {
      const configContent = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configContent);

     
      if (config.versions[version]?.config?.namespace) {
        namespace = config.versions[version]?.config?.namespace;
      }
    } catch (error) {
      console.warn('⚠️ 無法讀取配置文件，使用默認命名空間:', error);
    }

    // 定義執行順序
    const executionOrder = [
      'quota',
      'storageclass',
      'persistentvolume',
      'configmap',
      'secret',
      'deployment',
      'final'
    ];

    // 定義命令類型的翻譯鍵
    const commandDescriptions = {
      'quota': {
        titleKey: 'commandExecutor.commands.quota.title',
        descriptionKey: 'commandExecutor.commands.quota.description'
      },
      'storageclass': {
        titleKey: 'commandExecutor.commands.storageclass.title',
        descriptionKey: 'commandExecutor.commands.storageclass.description'
      },
      'persistentvolume': {
        titleKey: 'commandExecutor.commands.persistentvolume.title',
        descriptionKey: 'commandExecutor.commands.persistentvolume.description'
      },
      'configmap': {
        titleKey: 'commandExecutor.commands.configmap.title',
        descriptionKey: 'commandExecutor.commands.configmap.description'
      },
      'secret': {
        titleKey: 'commandExecutor.commands.secret.title',
        descriptionKey: 'commandExecutor.commands.secret.description'
      },
      'deployment': {
        titleKey: 'commandExecutor.commands.deployment.title',
        descriptionKey: 'commandExecutor.commands.deployment.description'
      },
      'final': {
        titleKey: 'commandExecutor.commands.final.title',
        descriptionKey: 'commandExecutor.commands.final.description'
      }
    };

    const scriptsPath = path.join(__dirname, '..', 'deploymentTemplate', name, 'deploy-scripts');
    const deploymentPath = path.join(__dirname, '..', 'deploymentTemplate', name);
    console.log('📂 腳本目錄路徑:', scriptsPath);
    console.log('📂 部署目錄路徑:', deploymentPath);
    
    try {
      // 讀取兩個目錄的檔案
      const [scriptsFiles, deploymentFiles] = await Promise.all([
        fs.readdir(scriptsPath).catch(() => []),
        fs.readdir(deploymentPath).catch(() => [])
      ]);
      
      // 過濾符合版本的 YAML 檔案
      const scriptYamlFiles = scriptsFiles.filter(file => 
        file.includes(version) && 
        (file.endsWith('.yaml') || file.endsWith('.yml'))
      ).map(file => ({ file, isDeployment: false }));
      
      const deploymentYamlFiles = deploymentFiles.filter(file => 
        file.includes(version) && 
        file.includes('final') &&
        (file.endsWith('.yaml') || file.endsWith('.yml'))
      ).map(file => ({ file, isDeployment: true }));
      
      // 合併所有檔案
      const allYamlFiles = [...scriptYamlFiles, ...deploymentYamlFiles];
      console.log('📄 符合條件的 YAML 文件:', allYamlFiles);

      // 生成命令列表
      const commands = allYamlFiles
        .sort((a, b) => {
          const typeA = a.file.includes('final') ? 'final' : a.file.split('-')[2]?.toLowerCase() || '';
          const typeB = b.file.includes('final') ? 'final' : b.file.split('-')[2]?.toLowerCase() || '';
          return executionOrder.indexOf(typeA) - executionOrder.indexOf(typeB);
        })
        .map(({ file, isDeployment }) => {
          const isFinalInRoot = !isDeployment && file.match(/^[^-]+-[^-]+-final\.(yaml|yml)$/);
          
          const typeMatch = file.match(/-([^-]+)\.(yaml|yml)$/);
          const type = isFinalInRoot ? 'final' :
                      file.includes('final') ? 'final' : 
                      (typeMatch ? typeMatch[1].toLowerCase() : 'unknown');
          
          const baseFolder = isFinalInRoot ? '' : (isDeployment ? '' : 'deploy-scripts');
          const filePath = path.join(
            '/app/deploymentTemplate',
            name,
            baseFolder,
            file
          ).replace(/\\/g, '/');
          
          // 添加命名空間到命令中
          const command = isDeployment
            ? `helm upgrade --install ${name} /app/deploymentTemplate/${name} -f ${filePath} --namespace ${namespace} --create-namespace`
            : `kubectl apply -f ${filePath} --namespace ${namespace}`;

          const descriptions = commandDescriptions[type] || {
            titleKey: `commandExecutor.commands.${type}.title`,
            descriptionKey: `commandExecutor.commands.${type}.description`
          };

          return {
            type,
            command,
            fileName: file,
            titleKey: descriptions.titleKey,
            descriptionKey: descriptions.descriptionKey,
            namespace // 添加命名空間到返回數據中
          };
        });

      console.log('📤 返回命令列表:', commands);
      res.json(commands);

    } catch (error) {
      console.error('❌ 讀取目錄失敗:', error);
      res.status(500).json({
        error: 'Failed to read directory',
        details: error.message
      });
    }
  } catch (error) {
    console.error('❌ 處理請求失敗:', error);
    res.status(500).json({
      error: 'Failed to process request',
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
    const workDir = path.join(__dirname, '../..');
    const { stdout, stderr } = await execAsync(command, {
      cwd: workDir,
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });

    // 處理輸出
    let formattedOutput = '';
    if (stdout) {
      const outputLines = stdout.split('\n');
      formattedOutput = outputLines.map(line => {
        if (line.includes('created')) return '✅ 成功創建資源';
        if (line.includes('configured')) return '📝 成功更新資源';
        if (line.includes('unchanged')) return '👌 資源無需更改';
        return line;
      }).join('\n');
    }

    if (stderr) {
      formattedOutput += '\n⚠️ 警告信息:\n' + stderr;
    }

    res.json({ 
      success: true,
      output: formattedOutput
    });

  } catch (error) {
    console.error('❌ 命令執行失敗:', error);
    
    // 格式化錯誤信息
    let errorMessage = '執行失敗: ';
    if (error.message.includes('not found')) {
      errorMessage += '找不到指定的資源';
    } else if (error.message.includes('permission denied')) {
      errorMessage += '權限不足';
    } else {
      errorMessage += error.message;
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message
    });
  }
};

module.exports = {
  getCommands,
  executeCommand
};
