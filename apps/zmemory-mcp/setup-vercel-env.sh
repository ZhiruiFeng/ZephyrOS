#!/bin/bash

# Vercel环境变量设置脚本
# 在zmemory-mcp目录下运行: chmod +x setup-vercel-env.sh && ./setup-vercel-env.sh

echo "🔧 设置Vercel环境变量..."

# 设置生产环境变量
vercel env add ZMEMORY_API_URL production
vercel env add OAUTH_CLIENT_ID production
vercel env add OAUTH_CLIENT_SECRET production  
vercel env add OAUTH_REDIRECT_URI production
vercel env add OAUTH_SCOPE production
vercel env add ZMEMORY_TIMEOUT production

echo "✅ 环境变量设置完成！"
echo ""
echo "建议的环境变量值："
echo "ZMEMORY_API_URL: https://your-zmemory-api.vercel.app"
echo "OAUTH_CLIENT_ID: zmemory-mcp"
echo "OAUTH_CLIENT_SECRET: your_oauth_secret_here"
echo "OAUTH_REDIRECT_URI: http://localhost:3000/callback"
echo "OAUTH_SCOPE: tasks.write"
echo "ZMEMORY_TIMEOUT: 10000"
