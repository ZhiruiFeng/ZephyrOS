# 数据库更新步骤指南

## 更新概述
本次更新将为任务管理系统添加分类和任务关系功能，包括：
- 新增 `categories` 表
- 更新 `tasks` 表，添加新字段
- 新增 `task_relations` 表
- 更新相关索引和安全策略

## ⚠️ 更新前准备

### 1. 备份数据库
```bash
# 如果使用 Supabase，可以通过 Dashboard 创建备份
# 或者使用 pg_dump 导出数据
pg_dump -h your-db-host -U your-username -d your-database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 检查当前表结构
```sql
-- 检查 tasks 表当前结构
\d tasks;

-- 检查是否已存在相关表
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('categories', 'task_relations');
```

## 📋 更新步骤

### 步骤 1: 创建分类表
```sql
-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

### 步骤 2: 更新任务表结构
```sql
-- 添加新字段到 tasks 表
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_duration INTEGER; -- 分钟
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- 更新状态和优先级约束
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- 添加进度约束（兼容不支持 ADD CONSTRAINT IF NOT EXISTS 的 PostgreSQL 版本）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_progress_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_progress_check CHECK (progress >= 0 AND progress <= 100);
  END IF;
END $$;
```

### 步骤 3: 创建任务关系表
```sql
-- 创建任务关系表
CREATE TABLE IF NOT EXISTS task_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('subtask', 'related', 'dependency', 'blocked_by')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid(),
  UNIQUE(parent_task_id, child_task_id, relation_type)
);
```

### 步骤 4: 添加触发器
```sql
-- 为分类表添加更新时间触发器
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### 步骤 5: 创建索引
```sql
-- Categories 表索引
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Tasks 表新索引
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_progress ON tasks(progress);

-- Task Relations 表索引
CREATE INDEX IF NOT EXISTS idx_task_relations_parent ON task_relations(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_child ON task_relations(child_task_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_type ON task_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_task_relations_user_id ON task_relations(user_id);
```

### 步骤 6: 启用行级安全策略
```sql
-- 启用 RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_relations ENABLE ROW LEVEL SECURITY;

-- Categories 安全策略
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Task Relations 安全策略
CREATE POLICY "Users can view their own task relations" ON task_relations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task relations" ON task_relations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task relations" ON task_relations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task relations" ON task_relations
  FOR DELETE USING (auth.uid() = user_id);
```

### 步骤 7: 插入默认分类数据
```sql
-- 插入默认分类（可选）
INSERT INTO categories (name, description, color, icon) VALUES
  ('工作', '工作相关的任务', '#3B82F6', 'briefcase'),
  ('个人', '个人生活相关', '#10B981', 'user'),
  ('项目', '项目相关任务', '#F59E0B', 'folder'),
  ('会议', '会议和沟通', '#8B5CF6', 'users'),
  ('学习', '学习和技能提升', '#EF4444', 'book'),
  ('维护', '系统维护和优化', '#6B7280', 'wrench'),
  ('其他', '其他类型任务', '#9CA3AF', 'ellipsis-h')
ON CONFLICT DO NOTHING;
```

## 🚀 执行方式

### 方式1: 使用 Supabase Dashboard
1. 登录 Supabase Dashboard
2. 进入项目的 SQL Editor
3. 按步骤逐一执行上述 SQL 语句
4. 检查执行结果

### 方式2: 使用完整脚本
```bash
# 使用完整的 schema.sql 文件
psql -h your-db-host -U your-username -d your-database -f supabase/schema.sql
```

### 方式3: 使用 Supabase CLI
```bash
# 如果使用 Supabase 本地开发
supabase db reset
# 或
supabase db push
```

## ✅ 验证更新

### 1. 检查表结构
```sql
-- 验证表是否创建成功
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('categories', 'task_relations');

-- 检查 tasks 表新字段
\d tasks;
```

### 2. 检查索引
```sql
-- 检查索引是否创建
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('categories', 'tasks', 'task_relations');
```

### 3. 检查安全策略
```sql
-- 检查 RLS 策略
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('categories', 'task_relations');
```

### 4. 测试基本功能
```sql
-- 测试插入分类
INSERT INTO categories (name, description, color) 
VALUES ('测试分类', '测试描述', '#FF0000');

-- 测试更新任务
UPDATE tasks SET category_id = (SELECT id FROM categories LIMIT 1), progress = 50 
WHERE id = (SELECT id FROM tasks LIMIT 1);

-- 测试插入任务关系
INSERT INTO task_relations (parent_task_id, child_task_id, relation_type) 
VALUES (
  (SELECT id FROM tasks LIMIT 1 OFFSET 0), 
  (SELECT id FROM tasks LIMIT 1 OFFSET 1), 
  'subtask'
);
```

## 🔄 回滚方案

如果更新出现问题，可以执行以下回滚操作：

```sql
-- 回滚步骤（谨慎执行）
DROP TABLE IF EXISTS task_relations CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 删除 tasks 表新增字段
ALTER TABLE tasks DROP COLUMN IF EXISTS category_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS estimated_duration;
ALTER TABLE tasks DROP COLUMN IF EXISTS progress;
ALTER TABLE tasks DROP COLUMN IF EXISTS assignee;
ALTER TABLE tasks DROP COLUMN IF EXISTS completion_date;
ALTER TABLE tasks DROP COLUMN IF EXISTS notes;

-- 恢复原始约束
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
CHECK (priority IN ('low', 'medium', 'high'));
```

## 📝 注意事项

1. **数据备份**: 执行更新前务必备份数据库
2. **分阶段执行**: 建议分步骤执行，每步验证后再继续
3. **权限检查**: 确保执行用户有足够权限
4. **环境测试**: 先在测试环境执行，确认无误后再在生产环境执行
5. **监控性能**: 更新后观察数据库性能和应用表现

## 🎯 更新后任务

1. 更新应用代码以使用新的 API
2. 测试前端组件功能
3. 验证数据一致性
4. 监控系统性能
5. 更新文档和用户指南
