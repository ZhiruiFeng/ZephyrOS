-- 启用UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- 创建任务表
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_duration INTEGER, -- 分钟
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assignee TEXT,
  completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  user_id UUID DEFAULT auth.uid()
);

-- 创建任务关系表 (支持层级和网状关系)
CREATE TABLE IF NOT EXISTS task_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('subtask', 'related', 'dependency', 'blocked_by')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid(),
  UNIQUE(parent_task_id, child_task_id, relation_type)
);

-- 创建记忆表
CREATE TABLE IF NOT EXISTS memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'note' CHECK (type IN ('note', 'link', 'file', 'thought')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  user_id UUID DEFAULT auth.uid()
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid()
);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为分类表添加更新时间触发器
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 为任务表添加更新时间触发器
CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 为记忆表添加更新时间触发器
CREATE TRIGGER update_memories_updated_at 
  BEFORE UPDATE ON memories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_progress ON tasks(progress);

CREATE INDEX IF NOT EXISTS idx_task_relations_parent ON task_relations(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_child ON task_relations(child_task_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_type ON task_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_task_relations_user_id ON task_relations(user_id);

CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);

-- 启用行级安全策略
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own task relations" ON task_relations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task relations" ON task_relations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task relations" ON task_relations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task relations" ON task_relations
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own memories" ON memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- 插入默认分类
INSERT INTO categories (name, description, color, icon) VALUES
  ('工作', '工作相关的任务', '#3B82F6', 'briefcase'),
  ('个人', '个人生活相关', '#10B981', 'user'),
  ('项目', '项目相关任务', '#F59E0B', 'folder'),
  ('会议', '会议和沟通', '#8B5CF6', 'users'),
  ('学习', '学习和技能提升', '#EF4444', 'book'),
  ('维护', '系统维护和优化', '#6B7280', 'wrench'),
  ('其他', '其他类型任务', '#9CA3AF', 'ellipsis-h')
ON CONFLICT DO NOTHING; 

-- Time Tracking: 1) 事实表
CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category_id_snapshot UUID REFERENCES categories(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at   TIMESTAMPTZ,
  duration_minutes INTEGER, -- 在 end_at 确定时写入
  source TEXT DEFAULT 'timer' CHECK (source IN ('timer','manual','import')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tte_time_order_chk CHECK (end_at IS NULL OR end_at > start_at)
);

-- Time Tracking: 2) 触发器函数
CREATE OR REPLACE FUNCTION set_category_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id_snapshot IS NULL THEN
    SELECT category_id INTO NEW.category_id_snapshot FROM tasks WHERE id = NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION finalize_duration_minutes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_at IS NOT NULL THEN
    IF NEW.end_at <= NEW.start_at THEN
      RAISE EXCEPTION 'end_at must be greater than start_at';
    END IF;
    NEW.duration_minutes := GREATEST(
      1,
      ROUND(EXTRACT(EPOCH FROM (NEW.end_at - NEW.start_at))/60.0)::int
    );
  ELSE
    NEW.duration_minutes := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Time Tracking: 3) 触发器与索引
CREATE TRIGGER trg_tte_set_category_snapshot
  BEFORE INSERT ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_category_snapshot();

CREATE TRIGGER trg_tte_finalize_duration
  BEFORE INSERT OR UPDATE OF end_at ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION finalize_duration_minutes();

CREATE TRIGGER update_tte_updated_at 
  BEFORE UPDATE ON task_time_entries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 进行中唯一性（跨端一致）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_running_timer
ON task_time_entries(user_id)
WHERE end_at IS NULL;

-- 常用检索索引
CREATE INDEX IF NOT EXISTS idx_tte_user_task ON task_time_entries(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_tte_user_start ON task_time_entries(user_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_tte_user_category ON task_time_entries(user_id, category_id_snapshot);

-- Time Tracking: 4) RLS 与策略
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their entries" ON task_time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their entries" ON task_time_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND task_id IN (SELECT id FROM tasks WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can modify their entries" ON task_time_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their entries" ON task_time_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Time Tracking: 5) 任务缓存列
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS tracked_minutes_total INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS tracked_segments_count INTEGER DEFAULT 0 NOT NULL;

-- Time Tracking: 6) 缓存维护函数
CREATE OR REPLACE FUNCTION apply_tte_to_task_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.end_at IS NOT NULL THEN
      UPDATE tasks
      SET tracked_minutes_total = tracked_minutes_total + COALESCE(NEW.duration_minutes, 0),
          tracked_segments_count = tracked_segments_count + 1
      WHERE id = NEW.task_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 从进行中 -> 完成
    IF (OLD.end_at IS NULL) AND (NEW.end_at IS NOT NULL) THEN
      UPDATE tasks
      SET tracked_minutes_total = tracked_minutes_total + COALESCE(NEW.duration_minutes, 0),
          tracked_segments_count = tracked_segments_count + 1
      WHERE id = NEW.task_id;
    -- 完成状态下编辑（含跨任务迁移）
    ELSIF (OLD.end_at IS NOT NULL) AND (NEW.end_at IS NOT NULL) THEN
      IF NEW.task_id = OLD.task_id THEN
        UPDATE tasks
        SET tracked_minutes_total = tracked_minutes_total + (COALESCE(NEW.duration_minutes,0) - COALESCE(OLD.duration_minutes,0))
        WHERE id = NEW.task_id;
      ELSE
        UPDATE tasks
        SET tracked_minutes_total = GREATEST(0, tracked_minutes_total - COALESCE(OLD.duration_minutes,0)),
            tracked_segments_count = GREATEST(0, tracked_segments_count - 1)
        WHERE id = OLD.task_id;

        UPDATE tasks
        SET tracked_minutes_total = tracked_minutes_total + COALESCE(NEW.duration_minutes,0),
            tracked_segments_count = tracked_segments_count + 1
        WHERE id = NEW.task_id;
      END IF;
    -- 非常规：从完成 -> 再次进行中（撤销结束）
    ELSIF (OLD.end_at IS NOT NULL) AND (NEW.end_at IS NULL) THEN
      UPDATE tasks
      SET tracked_minutes_total = GREATEST(0, tracked_minutes_total - COALESCE(OLD.duration_minutes,0)),
          tracked_segments_count = GREATEST(0, tracked_segments_count - 1)
      WHERE id = OLD.task_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.end_at IS NOT NULL THEN
      UPDATE tasks
      SET tracked_minutes_total = GREATEST(0, tracked_minutes_total - COALESCE(OLD.duration_minutes,0)),
          tracked_segments_count = GREATEST(0, tracked_segments_count - 1)
      WHERE id = OLD.task_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tte_apply_cache
  AFTER INSERT OR UPDATE OR DELETE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION apply_tte_to_task_cache();

