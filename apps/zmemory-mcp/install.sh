#!/bin/bash

# ZMemory MCP Server 安装脚本

set -e  # 遇到错误时退出

echo "🚀 ZMemory MCP Server 安装脚本"
echo "==============================="

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js 18+ 版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 错误: Node.js 版本过低 (当前: $(node -v))，需要 18+ 版本"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 获取当前目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 当前目录: $SCRIPT_DIR"

# 安装依赖
echo "📦 安装依赖包..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

# 创建全局链接（可选）
echo "🔗 创建全局链接（可选）..."
read -p "是否要创建全局链接以便在任何地方使用 zmemory-mcp 命令？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm link
    echo "✅ 全局链接已创建，您可以使用 'zmemory-mcp' 命令"
else
    echo "⏭️  跳过全局链接创建"
fi

# 创建配置文件
echo "⚙️  创建配置文件..."
if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ 已创建 .env 配置文件"
    echo "📝 请编辑 .env 文件设置您的 ZMemory API URL"
else
    echo "ℹ️  .env 文件已存在"
fi

# 显示 Claude Desktop 配置说明
echo ""
echo "🔧 Claude Desktop 配置"
echo "======================="
echo "要在 Claude Desktop 中使用 ZMemory MCP Server，请："
echo ""
echo "1. 找到 Claude Desktop 配置文件："
echo "   • macOS: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo "   • Windows: %APPDATA%/Claude/claude_desktop_config.json"
echo ""
echo "2. 添加以下配置："
echo ""
if command -v zmemory-mcp &> /dev/null; then
cat << 'EOF'
{
  "mcpServers": {
    "zmemory": {
      "command": "zmemory-mcp",
      "env": {
        "ZMEMORY_API_URL": "http://localhost:3001"
      }
    }
  }
}
EOF
else
cat << EOF
{
  "mcpServers": {
    "zmemory": {
      "command": "node",
      "args": ["$SCRIPT_DIR/dist/index.js"],
      "env": {
        "ZMEMORY_API_URL": "http://localhost:3001"
      }
    }
  }
}
EOF
fi

echo ""
echo "3. 重启 Claude Desktop"
echo ""

# 显示使用说明
echo "📖 使用说明"
echo "==========="
echo "启动 ZMemory MCP Server："
echo "  npm run dev                    # 开发模式"
echo "  npm start                      # 生产模式"
echo "  node dist/index.js             # 直接运行"
echo ""
echo "测试连接："
echo "  # 确保 ZMemory API 运行在 http://localhost:3001"
echo "  # 然后在 Claude Desktop 中输入: '显示我的记忆统计信息'"
echo ""

# 显示下一步
echo "🎯 下一步"
echo "========"
echo "1. 启动 ZMemory API 服务器 (http://localhost:3001)"
echo "2. 配置 Claude Desktop（参考上面的说明）"
echo "3. 重启 Claude Desktop"
echo "4. 在 Claude 中测试 ZMemory 功能"
echo ""
echo "✨ 安装完成！"
