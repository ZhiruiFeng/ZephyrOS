#!/usr/bin/env node

/**
 * ZMemory MCP Server Entry Point
 * 
 * 启动ZMemory MCP服务器的主入口文件
 */

import 'dotenv/config';
import { ZMemoryMCPServer } from './server.js';
import { ZMemoryConfig } from './types.js';

async function main() {
  // 从环境变量获取配置
  const config: ZMemoryConfig = {
    apiUrl: process.env.ZMEMORY_API_URL || 'http://localhost:3001',
    apiKey: process.env.ZMEMORY_API_KEY,
    timeout: process.env.ZMEMORY_TIMEOUT ? parseInt(process.env.ZMEMORY_TIMEOUT) : 10000,
    oauth: {
      clientId: process.env.OAUTH_CLIENT_ID || 'zmemory-mcp',
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/callback',
      scope: process.env.OAUTH_SCOPE || 'tasks.write',
    },
  };

  // Locale from env
  const envLocale = (process.env.ZMEMORY_MCP_LOCALE || 'auto').toLowerCase();
  if (envLocale === 'en' || envLocale === 'zh' || envLocale === 'auto') {
    config.locale = envLocale as any;
  } else {
    config.locale = 'auto';
  }

  // 输出配置信息（不包含敏感信息）
  console.error(`ZMemory MCP Server 配置:`);
  console.error(`  API URL: ${config.apiUrl}`);
  console.error(`  API Key: ${config.apiKey ? '已设置' : '未设置'}`);
  console.error(`  超时时间: ${config.timeout}ms`);
  console.error(`  OAuth 客户端ID: ${config.oauth?.clientId}`);
  console.error(`  OAuth 重定向URI: ${config.oauth?.redirectUri}`);
  console.error(`  OAuth 权限范围: ${config.oauth?.scope}`);
  console.error(`  Locale: ${config.locale}`);
  console.error('');

  try {
    const server = new ZMemoryMCPServer(config);
    await server.run();
  } catch (error) {
    console.error('启动ZMemory MCP服务器失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 优雅退出
process.on('SIGINT', () => {
  console.error('收到SIGINT信号，正在退出...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('收到SIGTERM信号，正在退出...');
  process.exit(0);
});

main().catch((error) => {
  console.error('主函数执行失败:', error);
  process.exit(1);
});
