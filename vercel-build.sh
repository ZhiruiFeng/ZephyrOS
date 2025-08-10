#!/bin/bash

# Vercel 构建脚本
echo "🚀 开始构建 ZephyrOS 项目..."

# 检查环境变量
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ 错误: NEXT_PUBLIC_SUPABASE_URL 环境变量未设置"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ 错误: NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量未设置"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ 错误: SUPABASE_SERVICE_ROLE_KEY 环境变量未设置"
    exit 1
fi

echo "✅ 环境变量检查通过"

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

echo "✅ 构建完成!"
