# ZFlow 组件库

## 概述

ZFlow 是一个现代化的任务管理系统，支持任务分类、层级关系和网状关联。

## 数据库设计

### 核心表结构

#### 1. Categories (分类表)
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid(),
  UNIQUE(name, user_id)
);
```

#### 2. Tasks (任务表)
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_duration INTEGER, -- 分钟
  progress INTEGER DEFAULT 0,
  assignee TEXT,
  completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  user_id UUID DEFAULT auth.uid()
);
```

#### 3. Task Relations (任务关系表)
```sql
CREATE TABLE task_relations (
  id UUID PRIMARY KEY,
  parent_task_id UUID NOT NULL REFERENCES tasks(id),
  child_task_id UUID NOT NULL REFERENCES tasks(id),
  relation_type TEXT NOT NULL CHECK (relation_type IN ('subtask', 'related', 'dependency', 'blocked_by')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid(),
  UNIQUE(parent_task_id, child_task_id, relation_type)
);
```

### 关系类型

- **subtask**: 子任务关系 - 表示任务分解
- **related**: 相关任务 - 表示任务间的关联
- **dependency**: 依赖关系 - 表示前置条件
- **blocked_by**: 阻塞关系 - 表示被阻塞的任务

## 组件说明

### CategorySelector
分类选择器组件，支持：
- 分类搜索
- 颜色标识
- 清除选择
- 下拉选择

### TaskRelationManager
任务关系管理器，支持：
- 添加/删除任务关系
- 按关系类型分组显示
- 关系状态可视化
- 批量操作

### TaskEditor (增强版)
任务编辑器，新增字段：
- 分类选择
- 预计时长
- 进度跟踪
- 负责人
- 备注
- 完成时间

## API 端点

### Categories API
- `GET /api/categories` - 获取所有分类
- `POST /api/categories` - 创建分类
- `PUT /api/categories/[id]` - 更新分类
- `DELETE /api/categories/[id]` - 删除分类

### Task Relations API
- `GET /api/task-relations` - 获取任务关系
- `POST /api/task-relations` - 创建任务关系
- `DELETE /api/task-relations/[id]` - 删除任务关系

### Tasks API (增强版)
- `GET /api/tasks` - 获取任务列表（支持分类筛选）
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/[id]` - 更新任务
- `DELETE /api/tasks/[id]` - 删除任务

## 使用示例

### 创建带分类的任务
```typescript
const task = await tasksApi.create({
  title: '实现用户认证',
  description: '添加JWT认证系统',
  status: 'pending',
  priority: 'high',
  category_id: 'work-category-id',
  estimated_duration: 480, // 8小时
  progress: 0,
  assignee: '张三',
  tags: ['authentication', 'security']
});
```

### 添加任务关系
```typescript
await taskRelationsApi.create({
  parent_task_id: 'task-1',
  child_task_id: 'task-2',
  relation_type: 'subtask'
});
```

### 获取任务及其关系
```typescript
const task = await tasksApi.getById('task-id');
const relations = await taskRelationsApi.getByTask('task-id');
```

## 设计优势

1. **灵活的层级结构**: 支持任务分解和子任务管理
2. **网状关联**: 任务间可以建立多种类型的关系
3. **分类管理**: 每个任务只能属于一个分类，便于组织
4. **进度跟踪**: 支持任务进度和预计时长
5. **权限控制**: 基于用户的行级安全策略
6. **扩展性**: 易于添加新的关系类型和字段

## 前端集成

所有组件都使用 TypeScript 编写，提供完整的类型支持。组件采用 Tailwind CSS 样式，支持响应式设计。

## 下一步计划

1. 实现任务模板功能
2. 添加任务依赖图可视化
3. 支持批量任务操作
4. 实现任务时间线视图
5. 添加任务统计和报表功能
