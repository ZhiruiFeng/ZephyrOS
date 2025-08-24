#!/usr/bin/env node

/**
 * 安全检查脚本
 * 
 * 检查 ZMemory MCP 项目中的潜在安全问题
 */

import fs from 'fs';
import path from 'path';

async function checkSecurityIssues() {
  console.log('🔒 ZMemory MCP 安全检查\n');
  
  let issuesFound = 0;
  const issues = [];
  
  // 检查环境变量文件
  const envFiles = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production'
  ];
  
  console.log('📋 检查环境变量文件...');
  envFiles.forEach(envFile => {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      
      // 检查是否包含敏感信息
      const sensitivePatterns = [
        /OAUTH_CLIENT_SECRET\s*=\s*[^\s]+/g,
        /API_KEY\s*=\s*[^\s]+/g,
        /SECRET\s*=\s*[^\s]+/g,
        /PASSWORD\s*=\s*[^\s]+/g,
        /TOKEN\s*=\s*[^\s]+/g
      ];
      
      sensitivePatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          issuesFound++;
          issues.push(`⚠️  ${envFile} 包含敏感信息: ${matches[0].split('=')[0]}`);
        }
      });
      
      console.log(`  ✅ ${envFile} 已检查`);
    } else {
      console.log(`  ℹ️  ${envFile} 不存在`);
    }
  });
  
  // 检查生成的配置文件
  console.log('\n📋 检查生成的配置文件...');
  const generatedConfigsDir = path.join(process.cwd(), 'generated-configs');
  if (fs.existsSync(generatedConfigsDir)) {
    const files = fs.readdirSync(generatedConfigsDir);
    files.forEach(file => {
      if (file.endsWith('.env') || file.includes('config')) {
        issuesFound++;
        issues.push(`⚠️  发现生成的配置文件: generated-configs/${file}`);
      }
    });
    console.log(`  ℹ️  发现 ${files.length} 个生成的文件`);
  } else {
    console.log('  ✅ 没有生成的配置文件');
  }
  
  // 检查 Git 状态
  console.log('\n📋 检查 Git 状态...');
  try {
    const { execSync } = await import('child_process');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    
    const sensitiveFiles = gitStatus.split('\n').filter(line => {
      return line.includes('.env') || 
             line.includes('config') || 
             line.includes('secret') ||
             line.includes('key');
    });
    
    if (sensitiveFiles.length > 0) {
      issuesFound++;
      issues.push(`⚠️  发现敏感文件在 Git 暂存区: ${sensitiveFiles.join(', ')}`);
    }
    
    console.log('  ✅ Git 状态检查完成');
  } catch (error) {
    console.log('  ℹ️  无法检查 Git 状态（可能不在 Git 仓库中）');
  }
  
  // 检查 .gitignore
  console.log('\n📋 检查 .gitignore 配置...');
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    const requiredPatterns = [
      '.env',
      'generated-configs',
      '*.secret',
      '*.key'
    ];
    
    const missingPatterns = requiredPatterns.filter(pattern => {
      return !gitignoreContent.includes(pattern);
    });
    
    if (missingPatterns.length > 0) {
      issuesFound++;
      issues.push(`⚠️  .gitignore 缺少必要的模式: ${missingPatterns.join(', ')}`);
    }
    
    console.log('  ✅ .gitignore 配置检查完成');
  } else {
    issuesFound++;
    issues.push('⚠️  缺少 .gitignore 文件');
    console.log('  ❌ 缺少 .gitignore 文件');
  }
  
  // 输出结果
  console.log('\n📊 检查结果:');
  console.log('=' .repeat(50));
  
  if (issuesFound === 0) {
    console.log('🎉 没有发现安全问题！');
  } else {
    console.log(`⚠️  发现 ${issuesFound} 个潜在问题:`);
    issues.forEach(issue => {
      console.log(`  ${issue}`);
    });
  }
  
  console.log('\n🔒 安全建议:');
  console.log('1. 确保 .env 文件包含在 .gitignore 中');
  console.log('2. 不要将包含 client_secret 的文件提交到版本控制');
  console.log('3. 定期轮换 OAuth 客户端密钥');
  console.log('4. 使用 HTTPS 进行生产环境通信');
  console.log('5. 限制 OAuth 权限范围到最小必要权限');
  
  console.log('\n📝 安全最佳实践:');
  console.log('- 使用环境变量管理敏感信息');
  console.log('- 定期审查访问权限');
  console.log('- 监控认证日志');
  console.log('- 实施最小权限原则');
  
  return issuesFound === 0;
}

// 运行安全检查
if (import.meta.url === `file://${process.argv[1]}`) {
  const isSecure = checkSecurityIssues();
  process.exit(isSecure ? 0 : 1);
}
