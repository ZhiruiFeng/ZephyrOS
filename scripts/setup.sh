#!/bin/bash

echo "🚀 开始设置 ZephyrOS 项目..."

# 检查 Node.js 版本
echo "📋 检查 Node.js 版本..."
node_version=$(node --version)
echo "当前 Node.js 版本: $node_version"

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 创建环境变量文件
echo "🔧 创建环境变量文件..."
if [ ! -f .env.local ]; then
    cp env.example .env.local
    echo "✅ 已创建 .env.local 文件"
    echo "⚠️  请编辑 .env.local 文件，配置你的 Supabase 信息"
else
    echo "✅ .env.local 文件已存在"
fi

# 构建共享包
echo "🔨 构建共享包..."
npm run build --workspace=@zephyros/shared

# 检查端口是否可用
echo "🔍 检查端口可用性..."
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  端口 $1 已被占用"
        return 1
    else
        echo "✅ 端口 $1 可用"
        return 0
    fi
}

check_port 3001
check_port 3002

echo ""
echo "🎉 项目设置完成！"
echo ""
echo "📝 下一步操作："
echo "1. 编辑 .env.local 文件，配置 Supabase 信息"
echo "2. 运行 'npm run dev' 启动开发服务器"
echo "3. 访问 http://localhost:3001 查看 ZFlow"
echo "4. 访问 http://localhost:3002 查看 ZMemory"
echo ""
echo "🔗 相关链接："
echo "- 项目文档: README.md"
echo "- 部署指南: DEPLOYMENT.md"
echo "- Supabase 设置: supabase/schema.sql" 