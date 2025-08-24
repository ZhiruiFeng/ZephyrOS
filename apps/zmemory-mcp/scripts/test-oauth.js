#!/usr/bin/env node

/**
 * OAuth 认证测试脚本
 * 
 * 用于测试 ZMemory MCP 的 OAuth 认证功能
 */

import { ZMemoryClient } from '../dist/zmemory-client.js';

// 测试配置
const config = {
  apiUrl: process.env.ZMEMORY_API_URL || 'http://localhost:3001',
  oauth: {
    clientId: process.env.OAUTH_CLIENT_ID || 'zmemory-mcp',
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/callback',
    scope: process.env.OAUTH_SCOPE || 'tasks.write',
  },
};

async function testOAuthFlow() {
  console.log('🧪 开始 OAuth 认证测试...\n');

  const client = new ZMemoryClient(config);

  try {
    // 1. 测试认证 URL 生成
    console.log('1️⃣ 测试认证 URL 生成...');
    const authResult = await client.authenticate({
      client_id: config.oauth.clientId,
      redirect_uri: config.oauth.redirectUri,
      scope: config.oauth.scope,
    });
    
    console.log('✅ 认证 URL 生成成功');
    console.log(`   认证 URL: ${authResult.authUrl}`);
    console.log(`   状态参数: ${authResult.state}\n`);

    // 2. 测试认证状态检查
    console.log('2️⃣ 测试认证状态检查...');
    const authState = client.getAuthState();
    console.log(`   认证状态: ${authState.isAuthenticated ? '已认证' : '未认证'}\n`);

    // 3. 测试健康检查
    console.log('3️⃣ 测试 API 健康检查...');
    const isHealthy = await client.healthCheck();
    console.log(`   API 状态: ${isHealthy ? '正常' : '异常'}\n`);

    if (!isHealthy) {
      console.log('⚠️  API 不可用，请确保 ZMemory 服务器正在运行');
      return;
    }

    // 4. 测试未认证状态下的 API 调用
    console.log('4️⃣ 测试未认证状态下的 API 调用...');
    try {
      await client.searchMemories();
      console.log('❌ 错误：未认证状态下应该抛出异常');
    } catch (error) {
      if (error.name === 'OAuthError') {
        console.log('✅ 正确：未认证状态下抛出了 OAuth 错误');
        console.log(`   错误信息: ${error.message}`);
      } else {
        console.log('❌ 错误：抛出了意外的错误类型');
        console.log(`   错误类型: ${error.name}`);
        console.log(`   错误信息: ${error.message}`);
      }
    }
    console.log('');

    // 5. 测试手动设置令牌
    console.log('5️⃣ 测试手动设置访问令牌...');
    const testToken = 'test-access-token';
    client.setAccessToken(testToken);
    
    const newAuthState = client.getAuthState();
    console.log(`   认证状态: ${newAuthState.isAuthenticated ? '已认证' : '未认证'}`);
    console.log(`   令牌类型: ${newAuthState.tokens?.token_type || '无'}`);
    console.log('');

    // 6. 测试清除认证
    console.log('6️⃣ 测试清除认证状态...');
    client.clearAuth();
    
    const clearedAuthState = client.getAuthState();
    console.log(`   认证状态: ${clearedAuthState.isAuthenticated ? '已认证' : '未认证'}`);
    console.log('');

    console.log('🎉 OAuth 认证测试完成！');
    console.log('\n📝 下一步：');
    console.log('1. 访问上面的认证 URL 完成 OAuth 认证');
    console.log('2. 使用返回的授权码调用 exchange_code_for_token');
    console.log('3. 测试记忆管理功能');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.name === 'OAuthError') {
      console.error('   OAuth 错误:', error.error);
      console.error('   错误描述:', error.errorDescription);
    }
    process.exit(1);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testOAuthFlow().catch((error) => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}
