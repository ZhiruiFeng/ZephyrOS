# ZMemory MCP Server

ZMemory MCP Server 是一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的服务器，将 ZMemory 的记忆管理功能暴露给 AI Agent 使用。

## 🎯 功能特性

- **记忆管理工具**：提供添加、搜索、更新、删除记忆的完整功能
- **标准MCP协议**：遵循MCP规范，兼容所有支持MCP的AI工具
- **灵活配置**：支持不同环境和认证方式
- **错误处理**：完善的错误处理和用户友好的错误消息
- **统计信息**：提供记忆使用统计和分析

## 🔧 安装和配置

### 1. 安装依赖

```bash
cd apps/zmemory-mcp
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 环境配置

创建 `.env` 文件或设置环境变量：

```bash
# ZMemory API配置
ZMEMORY_API_URL=http://localhost:3001
ZMEMORY_API_KEY=your_api_key_if_needed
ZMEMORY_TIMEOUT=10000
```

### 4. 运行服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 🛠️ MCP 工具列表

### 1. `add_memory`
添加新的记忆或任务

**参数：**
- `type` (string): 记忆类型，如 "task", "note", "bookmark"
- `content` (object): 记忆内容
  - `title` (string): 标题
  - `description` (string, 可选): 详细描述
  - `status` (string, 可选): 状态 (pending, in_progress, completed, on_hold, cancelled)
  - `priority` (string, 可选): 优先级 (low, medium, high, urgent)
  - `category` (string, 可选): 分类
- `tags` (string[], 可选): 标签列表
- `metadata` (object, 可选): 额外元数据

**示例：**
```json
{
  "type": "task",
  "content": {
    "title": "完成项目文档",
    "description": "编写技术文档和用户指南",
    "status": "pending",
    "priority": "high",
    "category": "work"
  },
  "tags": ["documentation", "project"]
}
```

### 2. `search_memories`
搜索和筛选记忆

**参数：**
- `type` (string, 可选): 按类型筛选
- `status` (string, 可选): 按状态筛选
- `priority` (string, 可选): 按优先级筛选
- `category` (string, 可选): 按分类筛选
- `tags` (string[], 可选): 按标签筛选
- `keyword` (string, 可选): 关键词搜索
- `limit` (number, 可选): 返回数量限制，默认50
- `offset` (number, 可选): 分页偏移，默认0

### 3. `get_memory`
获取特定记忆的详细信息

**参数：**
- `id` (string): 记忆ID

### 4. `update_memory`
更新现有记忆

**参数：**
- `id` (string): 记忆ID
- `content` (object, 可选): 要更新的内容
- `tags` (string[], 可选): 要更新的标签
- `metadata` (object, 可选): 要更新的元数据

### 5. `delete_memory`
删除指定记忆

**参数：**
- `id` (string): 要删除的记忆ID

### 6. `get_memory_stats`
获取记忆统计信息

**参数：** 无

**返回：** 包含总数、类型分布、状态分布、优先级分布等统计信息

## 🔌 Claude Desktop 集成

要在 Claude Desktop 中使用 ZMemory MCP Server，需要在 Claude 的配置文件中添加服务器配置。

### macOS 配置路径
`~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows 配置路径
`%APPDATA%/Claude/claude_desktop_config.json`

### 配置示例

```json
{
  "mcpServers": {
    "zmemory": {
      "command": "node",
      "args": ["/path/to/ZephyrOS/apps/zmemory-mcp/dist/index.js"],
      "env": {
        "ZMEMORY_API_URL": "http://localhost:3001",
        "ZMEMORY_API_KEY": "your_api_key_if_needed"
      }
    }
  }
}
```

### 使用npm全局安装（推荐）

如果你想要更简单的配置，可以全局安装：

```bash
npm install -g /path/to/ZephyrOS/apps/zmemory-mcp
```

然后在Claude配置中使用：

```json
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
```

## 🧪 测试

### 手动测试

启动ZMemory API服务器：
```bash
cd apps/zmemory
npm run dev
```

启动MCP服务器：
```bash
cd apps/zmemory-mcp
npm run dev
```

### 使用MCP Inspector测试

安装MCP Inspector：
```bash
npm install -g @modelcontextprotocol/inspector
```

测试服务器：
```bash
mcp-inspector node dist/index.js
```

## 📝 开发指南

### 项目结构

```
src/
├── index.ts          # 入口文件
├── server.ts         # MCP服务器实现
├── zmemory-client.ts # ZMemory API客户端
└── types.ts          # 类型定义
```

### 添加新工具

1. 在 `types.ts` 中定义参数schema
2. 在 `zmemory-client.ts` 中实现API调用
3. 在 `server.ts` 中添加工具定义和处理器
4. 更新文档

### 调试

启用详细日志：
```bash
DEBUG=* npm run dev
```

## 🔄 与现有系统集成

### ZFlow Frontend 集成

ZFlow可以通过检测MCP服务器状态来提供增强功能：

```typescript
// 检查MCP服务器状态
const mcpStatus = await fetch('http://localhost:3001/api/health')
  .then(res => res.ok)
  .catch(() => false);

if (mcpStatus) {
  // 启用AI辅助功能
  enableAIFeatures();
}
```

### API兼容性

MCP服务器与现有的ZMemory API完全兼容，不会影响现有功能。

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request！
