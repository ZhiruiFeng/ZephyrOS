#!/usr/bin/env node

/**
 * OAuth 配置生成脚本
 * 
 * 用于生成 OAuth 客户端密钥和配置文件
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function generateClientSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateConfig() {
  const clientSecret = generateClientSecret();
  const clientId = 'zmemory-mcp';
  
  console.log('🔑 生成 OAuth 配置...\n');
  
  // ZMemory 配置
  const zmemoryConfig = {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [
      "http://localhost:3000/callback",
      "http://localhost:3001/callback"
    ],
    scopes: ["tasks.write", "tasks.read"]
  };
  
  // ZMemory MCP 配置
  const zmemoryMcpConfig = {
    ZMEMORY_API_URL: "http://localhost:3001",
    OAUTH_CLIENT_ID: clientId,
    OAUTH_CLIENT_SECRET: clientSecret,
    OAUTH_REDIRECT_URI: "http://localhost:3000/callback",
    OAUTH_SCOPE: "tasks.write",
    ZMEMORY_TIMEOUT: "10000"
  };
  
  console.log('📋 ZMemory 配置 (添加到 zmemory 的 .env 文件):');
  console.log('=' .repeat(60));
  console.log(`OAUTH_CLIENTS='[${JSON.stringify(zmemoryConfig, null, 2)}]'`);
  console.log('\n');
  
  console.log('📋 ZMemory MCP 配置 (添加到 zmemory-mcp 的 .env 文件):');
  console.log('=' .repeat(60));
  Object.entries(zmemoryMcpConfig).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });
  console.log('\n');
  
  console.log('🔒 安全提醒:');
  console.log('• 请妥善保管 client_secret，不要泄露给他人');
  console.log('• 不要将包含 client_secret 的文件提交到版本控制');
  console.log('• 生产环境请使用更强的密钥');
  console.log('\n');
  
  // 生成配置文件
  const configDir = path.join(process.cwd(), 'generated-configs');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // 生成 ZMemory 配置
  const zmemoryConfigPath = path.join(configDir, 'zmemory-oauth-config.env');
  fs.writeFileSync(zmemoryConfigPath, `OAUTH_CLIENTS='[${JSON.stringify(zmemoryConfig)}]'\n`);
  
  // 生成 ZMemory MCP 配置
  const zmemoryMcpConfigPath = path.join(configDir, 'zmemory-mcp-oauth-config.env');
  const zmemoryMcpConfigContent = Object.entries(zmemoryMcpConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n') + '\n';
  fs.writeFileSync(zmemoryMcpConfigPath, zmemoryMcpConfigContent);
  
  console.log('💾 配置文件已生成:');
  console.log(`   ZMemory: ${zmemoryConfigPath}`);
  console.log(`   ZMemory MCP: ${zmemoryMcpConfigPath}`);
  console.log('\n📝 使用方法:');
  console.log('1. 将 ZMemory 配置添加到 zmemory 项目的 .env 文件');
  console.log('2. 将 ZMemory MCP 配置添加到 zmemory-mcp 项目的 .env 文件');
  console.log('3. 重启两个服务');
  console.log('4. 运行 npm run test:oauth 测试配置');
}

// 运行生成器
if (import.meta.url === `file://${process.argv[1]}`) {
  generateConfig();
}
