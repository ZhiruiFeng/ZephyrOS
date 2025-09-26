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

  const accessToken = process.env.ACCESS_TOKEN; // 可选：传入 Supabase access token

  // 启动MCP服务器
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      ZMEMORY_API_URL: 'http://localhost:3001',
    },
  });

  // 构建测试消息（支持未认证与已认证两种路径）
  const testMessages = [];

  // 1) 工具列表
  testMessages.push({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  });

  // 2) 认证状态（未设置 token 时应显示未认证）
  testMessages.push({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'get_auth_status',
      arguments: {},
    },
  });

  let nextId = 3;

  if (accessToken) {
    // 3) 设置访问令牌（桥接 Supabase 会话）
    testMessages.push({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: {
        name: 'set_access_token',
        arguments: { access_token: accessToken },
      },
    });

    // 4) 再次检查认证状态
    testMessages.push({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: {
        name: 'get_auth_status',
        arguments: {},
      },
    });

    // 5) 系统状态（包含连接性与建议）
    testMessages.push({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: {
        name: 'get_system_status',
        arguments: { include_recent_errors: true, check_connectivity: true },
      },
    });

    // 6) 直接查询 AI 任务（示例：进行中）
    testMessages.push({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: {
        name: 'get_ai_tasks',
        arguments: { status: 'in_progress', limit: 5 },
      },
    });
  } else {
    // 未携带 token 的情况下，依旧测试系统状态（多数检查可运行，但访问受限）
    testMessages.push({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: {
        name: 'get_system_status',
        arguments: { include_recent_errors: true, check_connectivity: true },
      },
    });
  }

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
    }, i * 600);
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
