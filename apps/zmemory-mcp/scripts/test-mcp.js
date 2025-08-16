#!/usr/bin/env node

/**
 * ZMemory MCP Server Test Script
 * 
 * 用于测试MCP服务器功能的脚本
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '../dist/index.js');

async function testMCPServer() {
  console.log('🧪 正在测试ZMemory MCP服务器...\n');

  // 启动MCP服务器
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      ZMEMORY_API_URL: 'http://localhost:3001',
    },
  });

  // 测试数据
  const testMessages = [
    // 1. 列出工具
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    },
    // 2. 添加记忆
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'add_memory',
        arguments: {
          type: 'task',
          content: {
            title: 'MCP测试任务',
            description: '这是一个通过MCP添加的测试任务',
            status: 'pending',
            priority: 'medium',
          },
          tags: ['mcp', 'test'],
        },
      },
    },
    // 3. 搜索记忆
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'search_memories',
        arguments: {
          type: 'task',
          limit: 5,
        },
      },
    },
    // 4. 获取统计信息
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_memory_stats',
        arguments: {},
      },
    },
  ];

  let responseCount = 0;

  // 处理服务器响应
  server.stdout.on('data', (data) => {
    const response = data.toString().trim();
    if (response) {
      console.log(`📥 服务器响应 ${++responseCount}:`);
      try {
        const parsed = JSON.parse(response);
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        console.log(response);
      }
      console.log('─'.repeat(50));
    }
  });

  // 发送测试消息
  for (let i = 0; i < testMessages.length; i++) {
    const message = testMessages[i];
    
    setTimeout(() => {
      console.log(`📤 发送测试消息 ${i + 1}:`);
      console.log(JSON.stringify(message, null, 2));
      console.log('─'.repeat(50));
      
      server.stdin.write(JSON.stringify(message) + '\n');
    }, i * 1000);
  }

  // 等待一段时间后结束测试
  setTimeout(() => {
    console.log('\n✅ 测试完成');
    server.kill();
    process.exit(0);
  }, (testMessages.length + 2) * 1000);

  // 处理错误
  server.on('error', (error) => {
    console.error('❌ 服务器启动错误:', error);
    process.exit(1);
  });

  server.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ 服务器退出，代码: ${code}`);
      process.exit(1);
    }
  });
}

console.log('🚀 开始测试...');
console.log('请确保ZMemory API服务器正在运行 (http://localhost:3001)');
console.log('');

testMCPServer().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
