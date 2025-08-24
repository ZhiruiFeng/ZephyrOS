#!/usr/bin/env node

/**
 * Claude Desktop 配置设置脚本
 * 
 * 帮助用户设置 Claude Desktop 的 MCP 配置
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

function getClaudeConfigPath() {
  const platform = os.platform();
  
  if (platform === 'darwin') {
    // macOS
    return path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    // Windows
    return path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
  } else {
    // Linux
    return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  }
}

function generateClaudeConfig(clientSecret) {
  const currentDir = process.cwd();
  const zmemoryMcpPath = path.join(currentDir, 'dist', 'index.js');
  
  return {
    "$schema": "https://schemas.anthropic.com/claude-desktop-config.json",
    "mcpServers": {
      "zmemory": {
        "command": "node",
        "args": [zmemoryMcpPath],
        "env": {
          "ZMEMORY_API_URL": "http://localhost:3001",
          "OAUTH_CLIENT_ID": "zmemory-mcp",
          "OAUTH_CLIENT_SECRET": clientSecret,
          "OAUTH_REDIRECT_URI": "http://localhost:3000/callback",
          "OAUTH_SCOPE": "tasks.write"
        }
      }
    }
  };
}

function setupClaudeDesktop() {
  console.log('🔧 Claude Desktop 配置设置\n');
  
  // 检查是否已构建
  const distPath = path.join(process.cwd(), 'dist', 'index.js');
  if (!fs.existsSync(distPath)) {
    console.log('❌ 错误: 请先构建项目');
    console.log('   运行: npm run build');
    return;
  }
  
  // 获取 client_secret
  const args = process.argv.slice(2);
  let clientSecret = args[0];
  
  if (!clientSecret) {
    console.log('⚠️  请提供 client_secret');
    console.log('   用法: npm run setup:claude <client_secret>');
    console.log('   或者运行: npm run generate:oauth 获取 client_secret');
    return;
  }
  
  const configPath = getClaudeConfigPath();
  const configDir = path.dirname(configPath);
  
  console.log(`📁 Claude Desktop 配置路径: ${configPath}`);
  console.log(`🔑 使用 client_secret: ${clientSecret.substring(0, 8)}...`);
  console.log('');
  
  // 创建配置目录（如果不存在）
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log('✅ 创建配置目录');
  }
  
  // 生成配置
  const config = generateClaudeConfig(clientSecret);
  
  // 检查现有配置
  let existingConfig = {};
  if (fs.existsSync(configPath)) {
    try {
      const existingContent = fs.readFileSync(configPath, 'utf8');
      existingConfig = JSON.parse(existingContent);
      console.log('📖 读取现有配置');
    } catch (error) {
      console.log('⚠️  现有配置文件格式错误，将创建新配置');
    }
  }
  
  // 合并配置
  const mergedConfig = {
    ...existingConfig,
    mcpServers: {
      ...existingConfig.mcpServers,
      ...config.mcpServers
    }
  };
  
  // 写入配置
  try {
    fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2));
    console.log('✅ 配置已保存');
  } catch (error) {
    console.log('❌ 保存配置失败:', error.message);
    return;
  }
  
  console.log('\n📋 配置内容:');
  console.log('=' .repeat(60));
  console.log(JSON.stringify(mergedConfig, null, 2));
  console.log('=' .repeat(60));
  
  console.log('\n🎉 配置完成！');
  console.log('\n📝 下一步:');
  console.log('1. 重启 Claude Desktop 应用');
  console.log('2. 在 Claude 中测试: "请检查我的 ZMemory 认证状态"');
  console.log('3. 如果未认证，运行: "请帮我启动 ZMemory 的 OAuth 认证流程"');
  
  console.log('\n🔒 安全提醒:');
  console.log('• 确保 client_secret 的安全性');
  console.log('• 不要将配置文件提交到版本控制');
  console.log('• 定期更新 client_secret');
}

// 显示帮助信息
function showHelp() {
  console.log('🔧 Claude Desktop 配置设置工具\n');
  console.log('用法:');
  console.log('  npm run setup:claude <client_secret>\n');
  console.log('参数:');
  console.log('  client_secret   从 OAuth 配置中获取的客户端密钥\n');
  console.log('示例:');
  console.log('  npm run setup:claude a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456');
  console.log('\n获取 client_secret:');
  console.log('  npm run generate:oauth');
}

// 运行设置
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else {
    setupClaudeDesktop();
  }
}
