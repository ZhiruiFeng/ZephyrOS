# External AI Panel Database Design

## 概述

本文档描述了支持 External AI Panel 模块的数据库设计。该设计提供了完整的 AI Agent 管理、交互记录、使用统计和配置管理功能。

## 数据库架构

### 1. 核心表格

#### `ai_agents` - AI 代理表
存储用户管理的 AI 代理信息。

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | UUID | 主键 |
| `name` | TEXT | 代理显示名称 |
| `vendor` | agent_vendor | 供应商 (ChatGPT, Claude, Perplexity, ElevenLabs, Toland, Other) |
| `features` | agent_feature[] | 功能列表 (Brainstorming, Daily Q&A, Coding, MCP, News Search, Comet, TTS, STT, Companion, Speech) |
| `notes` | TEXT | 备注信息 |
| `activity_score` | REAL | 活动评分 (0.0-1.0) |
| `last_used_at` | TIMESTAMPTZ | 最后使用时间 |
| `usage_count` | INTEGER | 使用次数 |
| `configuration` | JSONB | 配置信息 |
| `is_active` | BOOLEAN | 是否激活 |
| `user_id` | UUID | 用户ID |

#### `ai_interactions` - AI 交互记录表
记录与 AI 代理的交互历史。

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | UUID | 主键 |
| `agent_id` | UUID | 关联的 AI 代理ID |
| `title` | TEXT | 交互标题 |
| `description` | TEXT | 交互描述 |
| `interaction_type` | TEXT | 交互类型 (conversation, brainstorming, coding, research, creative, analysis, other) |
| `external_link` | TEXT | 外部链接 |
| `external_id` | TEXT | 外部服务ID |
| `content_preview` | TEXT | 内容预览 |
| `tags` | TEXT[] | 标签列表 |
| `satisfaction_rating` | INTEGER | 满意度评分 (1-5) |
| `usefulness_rating` | INTEGER | 有用性评分 (1-5) |
| `feedback_notes` | TEXT | 反馈备注 |
| `started_at` | TIMESTAMPTZ | 开始时间 |
| `ended_at` | TIMESTAMPTZ | 结束时间 |
| `duration_minutes` | INTEGER | 持续时间（分钟） |
| `user_id` | UUID | 用户ID |

#### `ai_usage_stats` - 使用统计表
按日期聚合的使用统计数据。

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | UUID | 主键 |
| `user_id` | UUID | 用户ID |
| `date` | DATE | 统计日期 |
| `total_interactions` | INTEGER | 总交互次数 |
| `unique_agents_used` | INTEGER | 使用的唯一代理数 |
| `total_duration_minutes` | INTEGER | 总使用时长（分钟） |
| `feature_usage` | JSONB | 功能使用统计 |
| `vendor_usage` | JSONB | 供应商使用统计 |
| `avg_satisfaction` | REAL | 平均满意度 |
| `avg_usefulness` | REAL | 平均有用性 |

#### `ai_agent_configs` - 代理配置表
存储代理特定的配置和偏好设置。

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | UUID | 主键 |
| `agent_id` | UUID | 关联的 AI 代理ID |
| `config_key` | TEXT | 配置键 |
| `config_value` | JSONB | 配置值 |
| `config_type` | TEXT | 配置类型 (user_preference, system_setting, integration_config, custom_prompt) |
| `description` | TEXT | 配置描述 |
| `is_encrypted` | BOOLEAN | 是否加密 |
| `user_id` | UUID | 用户ID |

### 2. 枚举类型

#### `agent_vendor`
- ChatGPT
- Claude
- Perplexity
- ElevenLabs
- Toland
- Other

#### `agent_feature`
- Brainstorming
- Daily Q&A
- Coding
- MCP
- News Search
- Comet
- TTS
- STT
- Companion
- Speech

### 3. 索引设计

#### 性能优化索引
- `idx_ai_agents_user_id` - 按用户查询代理
- `idx_ai_agents_activity_score` - 按活动评分排序
- `idx_ai_agents_features` - GIN 索引支持功能搜索
- `idx_ai_interactions_created_at` - 按时间查询交互
- `idx_ai_interactions_tags` - GIN 索引支持标签搜索
- `idx_ai_usage_stats_user_date` - 按用户和日期查询统计

### 4. 数据库函数

#### `update_agent_activity_score(agent_uuid UUID)`
根据最近使用情况更新代理的活动评分。

#### `update_daily_usage_stats(target_date DATE)`
更新指定日期的使用统计数据。

#### `get_agent_usage_summary(agent_uuid UUID, days_back INTEGER)`
获取代理的使用摘要统计。

### 5. 触发器

#### 自动更新触发器
- `update_ai_agents_updated_at` - 自动更新修改时间
- `update_ai_interactions_updated_at` - 自动更新修改时间
- `trg_update_agent_on_interaction` - 创建交互时自动更新代理统计

### 6. 视图

#### `agent_summary`
包含使用统计的代理摘要视图。

#### `recent_interactions`
最近交互记录视图，包含代理信息。

### 7. 行级安全 (RLS)

所有表格都启用了行级安全，确保用户只能访问自己的数据：

- 用户只能查看、创建、更新、删除自己的 AI 代理
- 用户只能访问自己代理的交互记录
- 用户只能查看自己的使用统计
- 用户只能管理自己的代理配置

## API 接口

### AI Agents API (`/api/ai-agents`)

#### GET - 获取代理列表
```
GET /api/ai-agents?vendor=ChatGPT&feature=Coding&active_only=true
```

#### POST - 创建新代理
```json
{
  "name": "GPT-4",
  "vendor": "ChatGPT",
  "features": ["Brainstorming", "Coding"],
  "notes": "Main coding assistant",
  "activity_score": 0.8
}
```

#### PUT - 更新代理
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "activity_score": 0.9
}
```

#### DELETE - 删除代理
```
DELETE /api/ai-agents?id=uuid
```

### AI Interactions API (`/api/ai-interactions`)

#### GET - 获取交互记录
```
GET /api/ai-interactions?agent_id=uuid&limit=50&offset=0&type=conversation
```

#### POST - 创建交互记录
```json
{
  "agent_id": "uuid",
  "title": "Code Review Session",
  "interaction_type": "coding",
  "external_link": "https://chat.openai.com/share/abc123",
  "tags": ["code", "review"],
  "satisfaction_rating": 5,
  "usefulness_rating": 4
}
```

### Usage Stats API (`/api/ai-usage-stats`)

#### GET - 获取使用统计
```
GET /api/ai-usage-stats?days=30&start_date=2025-01-01&end_date=2025-01-31
```

## 使用示例

### 1. 创建 AI 代理
```sql
INSERT INTO ai_agents (name, vendor, features, notes, user_id) 
VALUES (
  'Claude Sonnet', 
  'Claude', 
  ARRAY['Coding', 'MCP'], 
  'Code review and MCP integration',
  auth.uid()
);
```

### 2. 记录交互
```sql
INSERT INTO ai_interactions (
  agent_id, title, interaction_type, external_link, tags, user_id
) VALUES (
  'agent-uuid',
  'Product strategy brainstorming',
  'brainstorming',
  'https://claude.ai/chat/xyz789',
  ARRAY['strategy', 'product'],
  auth.uid()
);
```

### 3. 查询活跃代理
```sql
SELECT * FROM agent_summary 
WHERE user_id = auth.uid() 
  AND is_active = true 
ORDER BY activity_score DESC;
```

### 4. 获取使用统计
```sql
SELECT * FROM ai_usage_stats 
WHERE user_id = auth.uid() 
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

## 数据迁移

运行迁移脚本以创建所有必要的表格、索引、函数和触发器：

```bash
psql -d your_database -f supabase/migrations/20250115_add_ai_agents_tables.sql
```

## 性能考虑

1. **索引优化**: 为常用查询模式创建了适当的索引
2. **JSONB 使用**: 使用 JSONB 存储灵活的配置和统计数据
3. **GIN 索引**: 为数组字段和 JSONB 字段创建了 GIN 索引
4. **视图缓存**: 使用视图简化复杂查询
5. **触发器优化**: 自动维护统计数据，减少手动更新需求

## 扩展性

该设计支持以下扩展：

1. **新供应商**: 在 `agent_vendor` 枚举中添加新值
2. **新功能**: 在 `agent_feature` 枚举中添加新值
3. **自定义配置**: 通过 `ai_agent_configs` 表存储任意配置
4. **分析功能**: 通过 `ai_usage_stats` 表支持详细的使用分析
5. **集成扩展**: 通过 `external_id` 和 `external_metadata` 字段支持外部服务集成

## 安全考虑

1. **行级安全**: 所有表格都启用了 RLS
2. **用户隔离**: 用户只能访问自己的数据
3. **输入验证**: API 层使用 Zod 进行输入验证
4. **权限控制**: 基于 Supabase Auth 的权限控制
5. **数据加密**: 支持敏感配置的加密存储

这个数据库设计为 External AI Panel 模块提供了完整的数据支持，包括代理管理、交互记录、使用统计和配置管理等功能。
