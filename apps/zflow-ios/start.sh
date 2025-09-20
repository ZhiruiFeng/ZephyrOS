#!/bin/bash

# ZFlow iOS 启动脚本

echo "🚀 启动 ZFlow iOS 应用..."

# 检查是否安装了 Expo CLI
if ! command -v expo &> /dev/null; then
    echo "❌ Expo CLI 未安装，正在安装..."
    npm install -g @expo/cli
fi

# 检查后端服务是否运行
echo "🔍 检查后端服务状态..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ ZMemory 后端服务正在运行"
else
    echo "⚠️  ZMemory 后端服务未运行，请先启动后端服务："
    echo "   npm run dev -w @zephyros/zmemory-api"
    echo ""
    echo "继续启动iOS应用（将无法连接API）..."
fi

# 启动 Expo 开发服务器
echo "📱 启动 Expo 开发服务器..."
expo start --clear

echo "✅ 应用已启动！"
echo "📱 在iOS模拟器中打开应用，或扫描二维码在真机上运行"
