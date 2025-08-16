# ZMemory MCP Server 使用示例

## 基本配置

### 1. Claude Desktop 配置

在 Claude Desktop 的配置文件中添加 ZMemory MCP 服务器：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zmemory": {
      "command": "node",
      "args": ["/path/to/ZephyrOS/apps/zmemory-mcp/dist/index.js"],
      "env": {
        "ZMEMORY_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

### 2. 环境变量配置

创建 `.env` 文件：

```bash
ZMEMORY_API_URL=http://localhost:3001
ZMEMORY_TIMEOUT=10000
```

## 使用场景示例

### 1. 任务管理

**添加新任务：**
```
请帮我添加一个新任务：
- 标题：完成季度报告
- 描述：整理Q1数据并生成分析报告
- 优先级：高
- 状态：待处理
- 标签：工作, 报告, Q1
```

Claude 会调用 `add_memory` 工具：
```json
{
  "type": "task",
  "content": {
    "title": "完成季度报告",
    "description": "整理Q1数据并生成分析报告",
    "status": "pending",
    "priority": "high",
    "category": "work"
  },
  "tags": ["工作", "报告", "Q1"]
}
```

**搜索任务：**
```
显示所有高优先级的待处理任务
```

Claude 会调用 `search_memories` 工具：
```json
{
  "type": "task",
  "status": "pending",
  "priority": "high"
}
```

### 2. 笔记管理

**添加学习笔记：**
```
帮我记录一个学习笔记：
- 主题：MCP协议学习
- 内容：学习了Model Context Protocol的基本概念和实现方法
- 标签：学习, 技术, MCP
```

Claude 会调用 `add_memory` 工具：
```json
{
  "type": "note",
  "content": {
    "title": "MCP协议学习",
    "description": "学习了Model Context Protocol的基本概念和实现方法",
    "category": "learning"
  },
  "tags": ["学习", "技术", "MCP"]
}
```

### 3. 书签管理

**保存有用链接：**
```
帮我保存这个网站：
- 网址：https://modelcontextprotocol.io/
- 标题：Model Context Protocol官网
- 描述：MCP协议的官方文档和规范
```

Claude 会调用 `add_memory` 工具：
```json
{
  "type": "bookmark",
  "content": {
    "title": "Model Context Protocol官网",
    "description": "MCP协议的官方文档和规范",
    "url": "https://modelcontextprotocol.io/",
    "category": "tech-docs"
  },
  "tags": ["文档", "MCP", "技术"]
}
```

### 4. 项目管理

**创建项目记录：**
```
帮我创建一个新项目记录：
- 项目名：ZMemory MCP集成
- 状态：进行中
- 优先级：高
- 描述：将ZMemory集成到MCP协议中，支持AI Agent调用
- 截止日期：2024-02-01
```

Claude 会调用 `add_memory` 工具：
```json
{
  "type": "project",
  "content": {
    "title": "ZMemory MCP集成",
    "description": "将ZMemory集成到MCP协议中，支持AI Agent调用",
    "status": "in_progress",
    "priority": "high",
    "due_date": "2024-02-01",
    "category": "development"
  },
  "tags": ["项目", "MCP", "开发"]
}
```

### 5. 数据分析

**查看统计信息：**
```
显示我的记忆统计信息
```

Claude 会调用 `get_memory_stats` 工具，返回：
```
记忆统计信息:

总记忆数: 156
最近24小时新增: 8

按类型分布:
  task: 89
  note: 34
  bookmark: 23
  project: 10

按状态分布:
  pending: 45
  in_progress: 23
  completed: 67
  on_hold: 5

按优先级分布:
  high: 34
  medium: 78
  low: 44
```

## 高级使用技巧

### 1. 批量操作

```
帮我找到所有标记为"学习"的笔记，并把它们的分类改为"knowledge"
```

Claude 会：
1. 调用 `search_memories` 搜索标签包含"学习"的记忆
2. 对每个结果调用 `update_memory` 更新分类

### 2. 智能分类

```
我刚读了一篇关于React性能优化的文章，帮我记录要点并合理分类
```

Claude 可以：
1. 理解内容并创建合适的记忆结构
2. 自动选择适当的标签和分类
3. 调用 `add_memory` 保存

### 3. 任务跟进

```
显示我上周创建但还没完成的所有任务
```

Claude 会：
1. 计算日期范围
2. 调用 `search_memories` 筛选条件
3. 格式化显示结果

## 错误处理

### 常见错误及解决方法

**1. 连接错误**
```
错误: Failed to connect to ZMemory API
```
解决：检查 ZMemory API 服务器是否运行在配置的地址上

**2. 认证错误**
```
错误: Unauthorized
```
解决：检查 `ZMEMORY_API_KEY` 环境变量是否正确设置

**3. 数据验证错误**
```
错误: Invalid request data
```
解决：检查提供的数据是否符合预期格式

## 性能优化

### 搜索优化
- 使用具体的筛选条件而不是广泛搜索
- 适当设置 `limit` 参数控制返回数量
- 使用标签进行快速筛选

### 批量操作
- 避免在短时间内进行大量API调用
- 考虑使用缓存来减少重复查询

## 集成建议

### 1. 与其他工具结合
- 可以与日历应用集成，创建带截止日期的任务
- 与文档工具结合，自动保存重要链接和笔记
- 与代码编辑器集成，记录代码片段和技术笔记

### 2. 工作流自动化
- 设置定期回顾提醒
- 自动标记过期任务
- 基于优先级和截止日期智能排序

### 3. 团队协作
- 共享项目相关的记忆
- 协作编辑笔记和文档
- 团队任务分配和跟踪
