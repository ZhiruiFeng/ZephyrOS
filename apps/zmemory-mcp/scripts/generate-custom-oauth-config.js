#!/usr/bin/env node

/**
 * 自定义 OAuth 配置生成脚本
 * 
 * 用于生成与现有生产环境配置兼容的 OAuth 客户端配置
 * 支持自定义生产环境 URL 和重定向 URI
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function generateClientSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateCustomConfig() {
  const clientSecret = generateClientSecret();
  const clientId = 'zmemory-mcp';
  
  // 获取命令行参数
  const args = process.argv.slice(2);
  const apiUrl = args[0] || 'https://your-zmemory-api-domain.com';
  const redirectUri = args[1] || 'http://localhost:3000/callback';
  
  console.log('🔑 生成自定义 OAuth 配置...\n');
  console.log(`📡 API URL: ${apiUrl}`);
  console.log(`🔄 重定向 URI: ${redirectUri}\n`);
  
  // 现有的生产环境配置
  const existingConfig = [
    {
        // Some other preconfigured clients
    }
  ];
  
  // 新的 zmemory-mcp 配置
  const newClientConfig = {
    "client_id": clientId,
    "client_secret": clientSecret,
    "redirect_uris": [
      redirectUri,
      "http://localhost:3001/callback"
    ],
    "scopes": ["tasks.write", "tasks.read"]
  };
  
  // 合并配置
  const combinedConfig = [...existingConfig, newClientConfig];
  
  // ZMemory MCP 配置
  const zmemoryMcpConfig = {
    ZMEMORY_API_URL: apiUrl,
    OAUTH_CLIENT_ID: clientId,
    OAUTH_CLIENT_SECRET: clientSecret,
    OAUTH_REDIRECT_URI: redirectUri,
    OAUTH_SCOPE: "tasks.write",
    ZMEMORY_TIMEOUT: "10000"
  };
  
  console.log('📋 完整的 ZMemory OAuth 配置 (替换现有的 OAUTH_CLIENTS):');
  console.log('=' .repeat(80));
  console.log(`OAUTH_CLIENTS='${JSON.stringify(combinedConfig)}'`);
  console.log('\n');
  
  console.log('📋 ZMemory MCP 配置:');
  console.log('=' .repeat(60));
  Object.entries(zmemoryMcpConfig).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });
  console.log('\n');
  
  console.log('🔒 安全提醒:');
  console.log('• 请妥善保管 client_secret，不要泄露给他人');
  console.log('• 不要将包含 client_secret 的文件提交到版本控制');
  console.log('• 生产环境请使用 HTTPS 重定向 URI');
  console.log('• 确保现有 ChatGPT 集成不受影响');
  console.log('\n');
  
  // 生成配置文件
  const configDir = path.join(process.cwd(), 'generated-configs');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // 生成完整的 ZMemory 配置
  const zmemoryConfigPath = path.join(configDir, 'zmemory-custom-oauth-config.env');
  fs.writeFileSync(zmemoryConfigPath, `OAUTH_CLIENTS='${JSON.stringify(combinedConfig)}'\n`);
  
  // 生成 ZMemory MCP 配置
  const zmemoryMcpConfigPath = path.join(configDir, 'zmemory-mcp-custom-config.env');
  const zmemoryMcpConfigContent = Object.entries(zmemoryMcpConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';
  fs.writeFileSync(zmemoryMcpConfigPath, zmemoryMcpConfigContent);
  
  // 生成仅新增客户端的配置（用于增量更新）
  const incrementalConfigPath = path.join(configDir, 'zmemory-mcp-incremental-config.env');
  fs.writeFileSync(incrementalConfigPath, `OAUTH_CLIENTS='${JSON.stringify([newClientConfig])}'\n`);
  
  console.log('💾 配置文件已生成:');
  console.log(`   完整配置: ${zmemoryConfigPath}`);
  console.log(`   ZMemory MCP: ${zmemoryMcpConfigPath}`);
  console.log(`   增量配置: ${incrementalConfigPath}`);
  console.log('\n📝 使用方法:');
  console.log('1. 将完整配置替换 zmemory 生产环境的 OAUTH_CLIENTS');
  console.log('2. 将 ZMemory MCP 配置添加到 zmemory-mcp 项目的 .env 文件');
  console.log('3. 重启服务');
  console.log('\n📖 使用示例:');
  console.log('  # 使用默认配置');
  console.log('  npm run generate:custom');
  console.log('');
  console.log('  # 自定义 API URL');
  console.log('  npm run generate:custom https://api.zephyros.com');
  console.log('');
  console.log('  # 自定义 API URL 和重定向 URI');
  console.log('  npm run generate:custom https://api.zephyros.com https://localhost:3000/callback');
}

// 显示帮助信息
function showHelp() {
  console.log('🔧 自定义 OAuth 配置生成器\n');
  console.log('用法:');
  console.log('  npm run generate:custom [api-url] [redirect-uri]\n');
  console.log('参数:');
  console.log('  api-url        ZMemory API 的 URL (默认: https://your-zmemory-api-domain.com)');
  console.log('  redirect-uri   重定向 URI (默认: http://localhost:3000/callback)\n');
  console.log('示例:');
  console.log('  npm run generate:custom');
  console.log('  npm run generate:custom https://api.zephyros.com');
  console.log('  npm run generate:custom https://api.zephyros.com https://localhost:3000/callback');
}

// 运行生成器
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else {
    generateCustomConfig();
  }
}
