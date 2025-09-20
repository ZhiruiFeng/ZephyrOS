#!/bin/bash

# ZFlow iOS 验证脚本

echo "🔍 验证 ZFlow iOS 应用配置..."

# 检查必要文件
echo "📁 检查项目文件..."
required_files=(
    "package.json"
    "app.json"
    "App.tsx"
    "tsconfig.json"
    "babel.config.js"
    "src/screens/HomeScreen.tsx"
    "src/screens/TaskListScreen.tsx"
    "src/screens/TaskDetailScreen.tsx"
    "src/services/api.ts"
    "src/hooks/useTasks.ts"
    "src/hooks/useTask.ts"
    "src/types/Task.ts"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file 缺失"
        exit 1
    fi
done

# 检查TypeScript类型
echo ""
echo "🔧 检查TypeScript类型..."
if npm run type-check; then
    echo "✅ TypeScript类型检查通过"
else
    echo "❌ TypeScript类型检查失败"
    exit 1
fi

# 检查依赖
echo ""
echo "📦 检查依赖..."
if [ -d "node_modules" ]; then
    echo "✅ 依赖已安装"
else
    echo "⚠️  依赖未安装，正在安装..."
    npm install
fi

# 检查Expo CLI
echo ""
echo "🛠️  检查Expo CLI..."
if command -v expo &> /dev/null; then
    echo "✅ Expo CLI 已安装"
else
    echo "⚠️  Expo CLI 未安装，请运行: npm install -g @expo/cli"
fi

echo ""
echo "🎉 ZFlow iOS 应用配置验证完成！"
echo ""
echo "📱 启动应用:"
echo "   npm run start"
echo "   或"
echo "   ./start.sh"
echo ""
echo "🔗 确保ZMemory后端服务正在运行:"
echo "   npm run dev -w @zephyros/zmemory-api"
