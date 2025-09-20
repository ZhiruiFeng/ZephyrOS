#!/usr/bin/env node

// 简单的连接测试脚本
const https = require('https');
const http = require('http');

const API_URL = 'http://localhost:3001';

console.log('🔍 测试 ZFlow iOS 应用连接...\n');

// 测试健康检查端点
function testHealthCheck() {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}/api/health`;
    console.log(`📡 测试健康检查: ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 健康检查通过');
          resolve(JSON.parse(data));
        } else {
          console.log(`❌ 健康检查失败: ${res.statusCode}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', (err) => {
      console.log(`❌ 连接失败: ${err.message}`);
      reject(err);
    });
  });
}

// 测试任务API端点
function testTasksAPI() {
  return new Promise((resolve, reject) => {
    const url = `${API_URL}/api/tasks`;
    console.log(`📋 测试任务API: ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 任务API可访问');
          resolve(JSON.parse(data));
        } else {
          console.log(`❌ 任务API失败: ${res.statusCode}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', (err) => {
      console.log(`❌ 任务API连接失败: ${err.message}`);
      reject(err);
    });
  });
}

// 运行测试
async function runTests() {
  try {
    await testHealthCheck();
    await testTasksAPI();
    
    console.log('\n🎉 所有测试通过！');
    console.log('📱 ZFlow iOS 应用可以正常连接到后端服务');
    console.log('\n🚀 启动应用:');
    console.log('   npm run start');
    console.log('   或');
    console.log('   ./start.sh');
    
  } catch (error) {
    console.log('\n❌ 测试失败！');
    console.log('🔧 请确保 ZMemory 后端服务正在运行:');
    console.log('   npm run dev -w @zephyros/zmemory-api');
    console.log('\n📝 或者检查 API_URL 配置是否正确');
    process.exit(1);
  }
}

runTests();
