# ZMemory MCP Server

ZMemory MCP Server 是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的服务器，将 ZMemory 的记忆管理功能暴露给 AI Agent 使用。

## 🎯 功能特性

- **记忆管理工具**：提供添加、搜索、更新、删除记忆的完整功能
- **OAuth 2.0 认证**：支持安全的用户身份认证
- **标准MCP协议**：遵循MCP规范，兼容所有支持MCP的AI工具
- **灵活配置**：支持不同环境和认证方式
- **错误处理**：完善的错误处理和用户友好的错误消息
- **统计信息**：提供记忆使用统计和分析

## 📁 项目结构

```
apps/zmemory-mcp/
├── src/                          # 源代码
│   ├── index.ts                  # 入口文件
│   ├── server.ts                 # MCP服务器实现
│   ├── zmemory-client.ts         # ZMemory API客户端
│   └── types.ts                  # 类型定义
├── scripts/                      # 工具脚本
│   ├── generate-oauth-config.js      # 生成OAuth配置
│   ├── generate-custom-oauth-config.js # 自定义OAuth配置
│   ├── generate-prod-oauth-config.js  # 生产环境OAuth配置
│   ├── setup-claude-desktop.js       # Claude Desktop配置
│   ├── test-oauth.js                 # OAuth测试
│   └── test-mcp.js                   # MCP测试
├── configs/                      # 配置文件模板
│   ├── claude-desktop-config.json
│   └── claude-desktop-config-with-env.json
├── examples/                     # 使用示例
│   ├── oauth-setup.md           # OAuth设置指南
│   └── usage-examples.md        # 使用示例
├── dist/                        # 构建输出
├── generated-configs/           # 生成的配置文件（自动创建）
└── README.md                    # 项目文档
```

## 🚀 快速开始

### 1. 安装和构建

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

### 2. 生成 OAuth 配置

```bash
# 开发环境配置
npm run generate:oauth

# 生产环境配置（推荐）
npm run generate:custom https://your-api-domain.com
```

### 3. 配置 Claude Desktop

```bash
# 自动配置 Claude Desktop
npm run setup:claude YOUR_CLIENT_SECRET_HERE
```

### 4. 测试连接

```bash
# 测试 OAuth 功能
npm run test:oauth

# 测试 MCP 功能
npm run test:mcp
```

## 🔧 详细配置

### 环境配置

创建 `.env` 文件：

```bash
# ZMemory API配置
ZMEMORY_API_URL=http://localhost:3001

# OAuth 配置
OAUTH_CLIENT_ID=zmemory-mcp
OAUTH_CLIENT_SECRET=your-generated-secret-here
OAUTH_REDIRECT_URI=http://localhost:3000/callback
OAUTH_SCOPE=tasks.write

# 请求超时时间（毫秒）
ZMEMORY_TIMEOUT=10000
```

### ZMemory 服务器配置

在 zmemory 的 `.env` 文件中添加 OAuth 客户端：

```bash
OAUTH_CLIENTS='[
  {
    "client_id": "zmemory-mcp",
    "client_secret": "your-generated-secret-here",
    "redirect_uris": ["http://localhost:3000/callback"],
    "scopes": ["tasks.write", "tasks.read"]
  }
]'
```

## 🔐 OAuth 认证流程

### 1. 启动认证

在 Claude 中调用：
```
请帮我启动 ZMemory 的 OAuth 认证流程
```

### 2. 完成认证

1. 访问返回的认证 URL
2. 使用 Google 账号登录
3. 授权访问权限
4. 获取授权码

### 3. 交换令牌

```
请使用授权码 "your-code" 完成认证
```

### 4. 验证认证

```
请检查我的 ZMemory 认证状态
```

## 🛠️ MCP 工具列表

### OAuth 认证工具

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `authenticate` | 启动 OAuth 认证流程 | `client_id`, `redirect_uri`, `scope`, `state` |
| `exchange_code_for_token` | 使用授权码交换访问令牌 | `code`, `redirect_uri`, `code_verifier` |
| `refresh_token` | 刷新访问令牌 | `refresh_token` |
| `get_user_info` | 获取当前用户信息 | 无 |
| `set_access_token` | 手动设置访问令牌 | `access_token` |
| `get_auth_status` | 获取当前认证状态 | 无 |
| `clear_auth` | 清除认证状态 | 无 |

### 记忆管理工具

| 工具名称 | 描述 | 参数 |
|---------|------|------|
| `add_memory` | 添加新的记忆或任务 | `type`, `content`, `tags`, `metadata` |
| `search_memories` | 搜索和筛选记忆 | `type`, `status`, `priority`, `category`, `tags`, `keyword`, `limit`, `offset` |
| `get_memory` | 获取特定记忆详情 | `id` |
| `update_memory` | 更新现有记忆 | `id`, `content`, `tags`, `metadata` |
| `delete_memory` | 删除指定记忆 | `id` |
| `get_memory_stats` | 获取记忆统计信息 | 无 |

## 🔌 Claude Desktop 集成

### 自动配置

```bash
npm run setup:claude YOUR_CLIENT_SECRET_HERE
```

### 手动配置

配置文件路径：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

配置示例：
```json
{
  "$schema": "https://schemas.anthropic.com/claude-desktop-config.json",
  "mcpServers": {
    "zmemory": {
      "command": "node",
      "args": ["/path/to/zmemory-mcp/dist/index.js"],
      "env": {
        "ZMEMORY_API_URL": "http://localhost:3001",
        "OAUTH_CLIENT_ID": "zmemory-mcp",
        "OAUTH_CLIENT_SECRET": "your-secret-here",
        "OAUTH_REDIRECT_URI": "http://localhost:3000/callback",
        "OAUTH_SCOPE": "tasks.write"
      }
    }
  }
}
```

## 🧪 测试

### 运行测试

```bash
# OAuth 认证测试
npm run test:oauth

# MCP 功能测试
npm run test:mcp

# 类型检查
npm run type-check
```

### 使用 MCP Inspector

```bash
# 安装 MCP Inspector
npm install -g @modelcontextprotocol/inspector

# 测试服务器
mcp-inspector node dist/index.js
```

## 📝 使用示例

### 基本使用流程

1. **认证**：
   ```
   请帮我启动 ZMemory 的 OAuth 认证流程
   ```

2. **添加任务**：
   ```
   请帮我添加一个任务：完成项目文档，优先级高，分类为工作
   ```

3. **搜索任务**：
   ```
   请搜索所有高优先级的任务
   ```

4. **更新任务**：
   ```
   请将任务 "完成项目文档" 的状态更新为进行中
   ```

5. **查看统计**：
   ```
   请显示我的记忆统计信息
   ```

### 高级用法

查看详细示例：[examples/usage-examples.md](examples/usage-examples.md)

## 🔒 安全注意事项

1. **客户端密钥**: 确保 `client_secret` 的安全性，不要暴露在公开场合
2. **重定向 URI**: 只允许可信的重定向 URI
3. **令牌存储**: 令牌存储在内存中，重启后会丢失
4. **HTTPS**: 生产环境请使用 HTTPS
5. **权限范围**: 根据实际需要配置权限范围
6. **配置文件**: 不要将包含敏感信息的配置文件提交到版本控制

## 🔄 与现有系统集成

### 与 ChatGPT 集成兼容

ZMemory MCP 与现有的 ChatGPT 集成完全兼容：
- 使用相同的 OAuth 系统
- 共享用户认证状态
- 不影响现有的 ChatGPT 功能
- 可以同时使用两个客户端

### API 兼容性

MCP 服务器与现有的 ZMemory API 完全兼容，不会影响现有功能。

## 🛠️ 开发指南

### 添加新工具

1. 在 `types.ts` 中定义参数 schema
2. 在 `zmemory-client.ts` 中实现 API 调用
3. 在 `server.ts` 中添加工具定义和处理器
4. 更新文档

### 调试

```bash
# 启用详细日志
DEBUG=* npm run dev

# 开发模式运行
npm run dev
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📚 相关文档

- [OAuth 设置指南](examples/oauth-setup.md)
- [使用示例](examples/usage-examples.md)
- [API 文档](../zmemory/README.md)
