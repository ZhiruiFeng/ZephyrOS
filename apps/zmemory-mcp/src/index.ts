#!/usr/bin/env node

/**
 * ZMemory MCP Server Entry Point
 * 
 * 启动ZMemory MCP服务器的主入口文件
 */

import { ZMemoryMCPServer } from './server.js';
import { ZMemoryConfig } from './types.js';

async function main() {
  // 从环境变量获取配置
  const config: ZMemoryConfig = {
    apiUrl: process.env.ZMEMORY_API_URL || 'http://localhost:3001',
    apiKey: process.env.ZMEMORY_API_KEY,
    timeout: process.env.ZMEMORY_TIMEOUT ? parseInt(process.env.ZMEMORY_TIMEOUT) : 10000,
  };

  // 输出配置信息（不包含敏感信息）
  console.error(`ZMemory MCP Server 配置:`);
  console.error(`  API URL: ${config.apiUrl}`);
  console.error(`  API Key: ${config.apiKey ? '已设置' : '未设置'}`);
  console.error(`  超时时间: ${config.timeout}ms`);
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
