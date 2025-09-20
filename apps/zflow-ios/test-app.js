const fetch = require('node-fetch').default || require('node-fetch');

async function testApp() {
  console.log('🧪 测试 ZFlow iOS 应用...\n');
  
  try {
    // 测试Expo服务器状态
    console.log('1. 检查Expo服务器状态...');
    const statusResponse = await fetch('http://localhost:8081/status');
    if (statusResponse.ok) {
      console.log('✅ Expo服务器运行正常');
    } else {
      console.log('❌ Expo服务器状态异常');
      return;
    }
    
    // 测试应用包
    console.log('\n2. 检查应用包...');
    const bundleResponse = await fetch('http://localhost:8081/index.bundle?platform=ios&dev=true');
    if (bundleResponse.ok) {
      console.log('✅ 应用包生成成功');
    } else {
      console.log('❌ 应用包生成失败');
      return;
    }
    
    // 测试资源文件
    console.log('\n3. 检查资源文件...');
    const fs = require('fs');
    const path = require('path');
    
    const requiredAssets = [
      'assets/icon.png',
      'assets/splash.png',
      'assets/adaptive-icon.png',
      'assets/favicon.png'
    ];
    
    let allAssetsExist = true;
    for (const asset of requiredAssets) {
      if (fs.existsSync(path.join(__dirname, asset))) {
        console.log(`✅ ${asset} 存在`);
      } else {
        console.log(`❌ ${asset} 缺失`);
        allAssetsExist = false;
      }
    }
    
    if (!allAssetsExist) {
      console.log('❌ 部分资源文件缺失');
      return;
    }
    
    // 测试TypeScript编译
    console.log('\n4. 检查TypeScript编译...');
    const { execSync } = require('child_process');
    try {
      execSync('npm run type-check', { stdio: 'pipe' });
      console.log('✅ TypeScript编译通过');
    } catch (error) {
      console.log('❌ TypeScript编译失败');
      console.log(error.stdout?.toString() || error.message);
      return;
    }
    
    console.log('\n🎉 所有测试通过！ZFlow iOS应用已准备就绪！');
    console.log('\n📱 下一步：');
    console.log('   - 在iOS模拟器中打开应用');
    console.log('   - 或使用 Expo Go 应用扫描二维码');
    console.log('   - 或访问 http://localhost:8081 查看开发工具');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testApp();
