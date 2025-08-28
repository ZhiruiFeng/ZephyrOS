-- =====================================================
-- ZephyrOS Database Schema
-- Version: 1.0.0 with Subtasks Feature
-- Created: 2024
-- Last Updated: 2024-08-21
-- =====================================================

-- =====================================================
-- 1. EXTENSIONS
-- =====================================================

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. CORE TABLES
-- =====================================================

-- Custom domain types
-- Domain for energy level scaled 1..10
DO $$ BEGIN
  CREATE DOMAIN energy_level AS SMALLINT CHECK (VALUE BETWEEN 1 AND 10);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Categories table for organizing tasks
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

-- Main tasks table with subtasks support
CREATE TABLE IF NOT EXISTS tasks (
  -- Core task fields
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Timestamp fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  completion_date TIMESTAMP WITH TIME ZONE,
  
  -- Task details
  estimated_duration INTEGER, -- minutes
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assignee TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- User ownership
  user_id UUID DEFAULT auth.uid(),
  
  -- Time tracking (cached values)
  tracked_minutes_total INTEGER DEFAULT 0 NOT NULL,
  tracked_segments_count INTEGER DEFAULT 0 NOT NULL,
  
  -- Subtasks hierarchy fields
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  hierarchy_level INTEGER DEFAULT 0,
  hierarchy_path TEXT DEFAULT '',
  subtask_order INTEGER DEFAULT 0,
  
  -- Subtasks behavior control
  completion_behavior TEXT DEFAULT 'manual' 
    CHECK (completion_behavior IN ('manual', 'auto_when_subtasks_complete')),
  progress_calculation TEXT DEFAULT 'manual'
    CHECK (progress_calculation IN ('manual', 'average_subtasks', 'weighted_subtasks')),
  
  -- Subtasks cached counts
  subtask_count INTEGER DEFAULT 0,
  completed_subtask_count INTEGER DEFAULT 0
);

-- Task relations table for complex relationships (beyond parent-child)
CREATE TABLE IF NOT EXISTS task_relations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  child_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('subtask', 'related', 'dependency', 'blocked_by')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid(),
  UNIQUE(parent_task_id, child_task_id, relation_type)
);

-- Time tracking entries table
CREATE TABLE IF NOT EXISTS task_time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  category_id_snapshot UUID REFERENCES categories(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  duration_minutes INTEGER, -- calculated when end_at is set
  source TEXT DEFAULT 'timer' CHECK (source IN ('timer','manual','import')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tte_time_order_chk CHECK (end_at IS NULL OR end_at > start_at)
);

-- Memories table for knowledge management
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

-- Energy day table for per-day energy curve (72 x 20-minute slots)
CREATE TABLE IF NOT EXISTS energy_day (
  user_id UUID DEFAULT auth.uid() NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  tz TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  curve energy_level[] NOT NULL, -- length = 72, each value 1..10 enforced by domain
  -- user decision tracking
  last_checked_index SMALLINT CHECK (last_checked_index BETWEEN 0 AND 71),
  last_checked_at TIMESTAMPTZ,
  edited_mask BOOLEAN[] NOT NULL DEFAULT array_fill(false, ARRAY[72]), -- length = 72
  source TEXT NOT NULL CHECK (source IN ('simulated','user_edited','merged')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, local_date),

  -- guards
  CONSTRAINT curve_len CHECK (array_length(curve, 1) = 72),
  CONSTRAINT edited_mask_len CHECK (array_length(edited_mask, 1) = 72)
);

-- Tags table for organizing content
CREATE TABLE IF NOT EXISTS tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT auth.uid()
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Tasks indexes - Core fields
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_progress ON tasks(progress);

-- Tasks indexes - Subtasks hierarchy
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_hierarchy_level ON tasks(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_tasks_hierarchy_path ON tasks(hierarchy_path);
CREATE INDEX IF NOT EXISTS idx_tasks_subtask_order ON tasks(parent_task_id, subtask_order);
CREATE INDEX IF NOT EXISTS idx_tasks_completion_behavior ON tasks(completion_behavior);
CREATE INDEX IF NOT EXISTS idx_tasks_progress_calculation ON tasks(progress_calculation);

-- Task relations indexes
CREATE INDEX IF NOT EXISTS idx_task_relations_parent ON task_relations(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_child ON task_relations(child_task_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_type ON task_relations(relation_type);
CREATE INDEX IF NOT EXISTS idx_task_relations_user_id ON task_relations(user_id);

-- Time tracking indexes
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_running_timer 
  ON task_time_entries(user_id) WHERE end_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tte_user_task ON task_time_entries(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_tte_user_start ON task_time_entries(user_id, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_tte_user_category ON task_time_entries(user_id, category_id_snapshot);

-- Memories indexes
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- Energy day indexes
CREATE INDEX IF NOT EXISTS idx_energy_day_user_updated 
  ON energy_day(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_energy_day_user_date 
  ON energy_day(user_id, local_date);

-- =====================================================
-- 4. FUNCTIONS
-- =====================================================

-- Common utility function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Energy day atomic update function
CREATE OR REPLACE FUNCTION update_energy_segment(
  p_user_id UUID,
  p_local_date DATE,
  p_index INTEGER,
  p_value NUMERIC
) RETURNS TABLE(
  user_id UUID,
  local_date DATE,
  tz TEXT,
  curve NUMERIC[],
  edited_mask BOOLEAN[],
  last_checked_index INTEGER,
  last_checked_at TIMESTAMPTZ,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Validate index range (PostgreSQL uses 1-based arrays)
  IF p_index < 1 OR p_index > 72 THEN
    RAISE EXCEPTION 'index out of range (1..72)';
  END IF;
  
  -- Update the curve array and edited_mask atomically
  UPDATE energy_day 
  SET 
    curve[p_index] = p_value,
    edited_mask[p_index] = true,
    source = 'user_edited',
    updated_at = NOW()
  WHERE energy_day.user_id = p_user_id 
    AND energy_day.local_date = p_local_date;
    
  -- Return the updated row
  RETURN QUERY
  SELECT 
    ed.user_id,
    ed.local_date,
    ed.tz,
    ed.curve,
    ed.edited_mask,
    ed.last_checked_index,
    ed.last_checked_at,
    ed.source,
    ed.metadata,
    ed.created_at,
    ed.updated_at
  FROM energy_day ed
  WHERE ed.user_id = p_user_id 
    AND ed.local_date = p_local_date;
END;
$$ LANGUAGE plpgsql;

-- Time tracking functions
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
    -- From running -> completed
    IF (OLD.end_at IS NULL) AND (NEW.end_at IS NOT NULL) THEN
      UPDATE tasks
      SET tracked_minutes_total = tracked_minutes_total + COALESCE(NEW.duration_minutes, 0),
          tracked_segments_count = tracked_segments_count + 1
      WHERE id = NEW.task_id;
    -- Completed state edits (including task migration)
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
    -- From completed -> running again (undo end)
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

-- Subtasks hierarchy functions
CREATE OR REPLACE FUNCTION update_task_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Update hierarchy info when parent_task_id changes
  IF NEW.parent_task_id IS DISTINCT FROM OLD.parent_task_id THEN
    -- Update hierarchy level and path
    IF NEW.parent_task_id IS NULL THEN
      -- Root task
      NEW.hierarchy_level := 0;
      NEW.hierarchy_path := NEW.id::TEXT;
    ELSE
      -- Subtask: get hierarchy info from parent
      SELECT 
        hierarchy_level + 1,
        hierarchy_path || '/' || NEW.id::TEXT
      INTO 
        NEW.hierarchy_level,
        NEW.hierarchy_path
      FROM tasks 
      WHERE id = NEW.parent_task_id;
      
      -- Prevent circular references
      IF NEW.hierarchy_path LIKE '%' || NEW.id::TEXT || '/%' THEN
        RAISE EXCEPTION 'Circular reference detected in task hierarchy';
      END IF;
      
      -- Limit hierarchy depth
      IF NEW.hierarchy_level > 10 THEN
        RAISE EXCEPTION 'Maximum hierarchy depth exceeded (10 levels)';
      END IF;
    END IF;
    
    -- Recursively update all subtasks hierarchy info
    WITH RECURSIVE subtask_tree AS (
      -- Starting point: direct children of current task
      SELECT id, parent_task_id, hierarchy_level, hierarchy_path
      FROM tasks 
      WHERE parent_task_id = NEW.id
      
      UNION ALL
      
      -- Recursive part: children of children
      SELECT t.id, t.parent_task_id, t.hierarchy_level, t.hierarchy_path
      FROM tasks t
      INNER JOIN subtask_tree st ON t.parent_task_id = st.id
    )
    UPDATE tasks 
    SET 
      hierarchy_level = NEW.hierarchy_level + (
        SELECT COUNT(*) FROM unnest(string_to_array(tasks.hierarchy_path, '/')) 
        WHERE unnest <> ''
      ) - (
        SELECT COUNT(*) FROM unnest(string_to_array(NEW.hierarchy_path, '/')) 
        WHERE unnest <> ''
      ),
      hierarchy_path = replace(
        tasks.hierarchy_path, 
        split_part(tasks.hierarchy_path, '/', 1) || '/' || split_part(tasks.hierarchy_path, '/', 2),
        NEW.hierarchy_path
      )
    WHERE tasks.id IN (SELECT id FROM subtask_tree);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_subtask_tree(root_task_id UUID, max_depth INTEGER DEFAULT 5)
RETURNS TABLE (
  task_id UUID,
  parent_task_id UUID,
  title TEXT,
  status TEXT,
  progress INTEGER,
  hierarchy_level INTEGER,
  subtask_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subtask_tree AS (
    -- Starting point: root task
    SELECT 
      t.id::UUID as task_id,
      t.parent_task_id::UUID,
      t.title,
      t.status,
      t.progress,
      t.hierarchy_level,
      t.subtask_order
    FROM tasks t 
    WHERE t.id = root_task_id
    
    UNION ALL
    
    -- Recursive part: subtasks
    SELECT 
      t.id::UUID,
      t.parent_task_id::UUID,
      t.title,
      t.status,
      t.progress,
      t.hierarchy_level,
      t.subtask_order
    FROM tasks t
    INNER JOIN subtask_tree st ON t.parent_task_id = st.task_id
    WHERE st.hierarchy_level < max_depth
  )
  SELECT * FROM subtask_tree 
  ORDER BY hierarchy_level, subtask_order;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_subtask_progress(task_id UUID)
RETURNS INTEGER AS $$
DECLARE
  task_progress_calc TEXT;
  calculated_progress INTEGER := 0;
  subtask_count INTEGER := 0;
  total_progress INTEGER := 0;
BEGIN
  -- Get task's progress calculation method
  SELECT progress_calculation INTO task_progress_calc
  FROM tasks WHERE id = task_id;
  
  -- If manual calculation, return current progress
  IF task_progress_calc = 'manual' THEN
    SELECT progress INTO calculated_progress FROM tasks WHERE id = task_id;
    RETURN calculated_progress;
  END IF;
  
  -- Get direct subtasks progress info
  SELECT 
    COUNT(*),
    COALESCE(SUM(progress), 0)
  INTO 
    subtask_count,
    total_progress
  FROM tasks 
  WHERE parent_task_id = task_id;
  
  -- If no subtasks, return current progress
  IF subtask_count = 0 THEN
    SELECT progress INTO calculated_progress FROM tasks WHERE id = task_id;
    RETURN calculated_progress;
  END IF;
  
  -- Calculate based on method
  IF task_progress_calc = 'average_subtasks' THEN
    calculated_progress := total_progress / subtask_count;
  ELSIF task_progress_calc = 'weighted_subtasks' THEN
    -- Simplified version: equal weight average (can be extended for weights later)
    calculated_progress := total_progress / subtask_count;
  END IF;
  
  RETURN LEAST(100, GREATEST(0, calculated_progress));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_subtask_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT operations
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_task_id IS NOT NULL THEN
      UPDATE tasks 
      SET subtask_count = subtask_count + 1,
          completed_subtask_count = completed_subtask_count + 
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END
      WHERE id = NEW.parent_task_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- Parent task changed
    IF OLD.parent_task_id IS DISTINCT FROM NEW.parent_task_id THEN
      -- Remove from old parent
      IF OLD.parent_task_id IS NOT NULL THEN
        UPDATE tasks 
        SET subtask_count = subtask_count - 1,
            completed_subtask_count = completed_subtask_count - 
              CASE WHEN OLD.status = 'completed' THEN 1 ELSE 0 END
        WHERE id = OLD.parent_task_id;
      END IF;
      
      -- Add to new parent
      IF NEW.parent_task_id IS NOT NULL THEN
        UPDATE tasks 
        SET subtask_count = subtask_count + 1,
            completed_subtask_count = completed_subtask_count + 
              CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END
        WHERE id = NEW.parent_task_id;
      END IF;
    -- Only status changed
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.parent_task_id IS NOT NULL THEN
      UPDATE tasks 
      SET completed_subtask_count = completed_subtask_count + 
        CASE 
          WHEN OLD.status != 'completed' AND NEW.status = 'completed' THEN 1
          WHEN OLD.status = 'completed' AND NEW.status != 'completed' THEN -1
          ELSE 0
        END
      WHERE id = NEW.parent_task_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    IF OLD.parent_task_id IS NOT NULL THEN
      UPDATE tasks 
      SET subtask_count = subtask_count - 1,
          completed_subtask_count = completed_subtask_count - 
            CASE WHEN OLD.status = 'completed' THEN 1 ELSE 0 END
      WHERE id = OLD.parent_task_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_complete_parent_task()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check when subtask is completed
  IF TG_OP = 'UPDATE' AND 
     OLD.status != 'completed' AND 
     NEW.status = 'completed' AND 
     NEW.parent_task_id IS NOT NULL THEN
    
    -- Check if parent task is set to auto-complete
    PERFORM 1 
    FROM tasks 
    WHERE id = NEW.parent_task_id 
      AND completion_behavior = 'auto_when_subtasks_complete'
      AND status != 'completed'
      AND subtask_count > 0
      AND completed_subtask_count + 1 = subtask_count; -- +1 because count not updated yet
    
    IF FOUND THEN
      UPDATE tasks 
      SET status = 'completed',
          completion_date = NOW(),
          progress = 100
      WHERE id = NEW.parent_task_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Security function for hierarchy access
CREATE OR REPLACE FUNCTION user_can_access_task_hierarchy(task_id UUID, requesting_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  root_task_user_id UUID;
BEGIN
  -- Find root task through hierarchy_path and check user permissions
  WITH task_root AS (
    SELECT split_part(hierarchy_path, '/', 1)::UUID as root_id
    FROM tasks 
    WHERE id = task_id
  )
  SELECT user_id INTO root_task_user_id
  FROM tasks t, task_root tr
  WHERE t.id = tr.root_id;
  
  RETURN root_task_user_id = requesting_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Updated timestamp triggers
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at 
  BEFORE UPDATE ON memories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tte_updated_at 
  BEFORE UPDATE ON task_time_entries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_energy_day_updated_at
  BEFORE UPDATE ON energy_day
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Time tracking triggers
CREATE TRIGGER trg_tte_set_category_snapshot
  BEFORE INSERT ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_category_snapshot();

CREATE TRIGGER trg_tte_finalize_duration
  BEFORE INSERT OR UPDATE OF end_at ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION finalize_duration_minutes();

CREATE TRIGGER trg_tte_apply_cache
  AFTER INSERT OR UPDATE OR DELETE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION apply_tte_to_task_cache();

-- Subtasks hierarchy triggers
CREATE TRIGGER trg_maintain_task_hierarchy
  BEFORE INSERT OR UPDATE OF parent_task_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_hierarchy();

CREATE TRIGGER trg_update_subtask_counts
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_subtask_counts();

CREATE TRIGGER trg_auto_complete_parent
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_parent_task();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_day ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can view their own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Task relations policies
CREATE POLICY "Users can view their own task relations" ON task_relations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task relations" ON task_relations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task relations" ON task_relations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task relations" ON task_relations
  FOR DELETE USING (auth.uid() = user_id);

-- Time tracking policies
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

-- Memories policies
CREATE POLICY "Users can view their own memories" ON memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view their own tags" ON tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON tags
  FOR DELETE USING (auth.uid() = user_id);

-- Energy day policies
CREATE POLICY "Users can view their own energy days" ON energy_day
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own energy days" ON energy_day
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own energy days" ON energy_day
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own energy days" ON energy_day
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 7. INITIAL DATA
-- =====================================================

-- Insert default categories
INSERT INTO categories (name, description, color, icon) VALUES
  ('工作', '工作相关的任务', '#3B82F6', 'briefcase'),
  ('个人', '个人生活相关', '#10B981', 'user'),
  ('项目', '项目相关任务', '#F59E0B', 'folder'),
  ('会议', '会议和沟通', '#8B5CF6', 'users'),
  ('学习', '学习和技能提升', '#EF4444', 'book'),
  ('维护', '系统维护和优化', '#6B7280', 'wrench'),
  ('其他', '其他类型任务', '#9CA3AF', 'ellipsis-h')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SCHEMA VERSION COMPLETE
-- =====================================================