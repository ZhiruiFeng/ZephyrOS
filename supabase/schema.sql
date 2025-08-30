-- =====================================================
-- ZephyrOS Database Schema
-- Version: 2.0.0 with Timeline Items Architecture
-- Created: 2024
-- Last Updated: 2024-08-30
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

-- =====================================================
-- 2.1 TIMELINE ITEMS ARCHITECTURE
-- =====================================================

-- Supertype table: timeline_items
-- Contains all time-related entities (tasks, activities, routines, habits, memories)
CREATE TABLE IF NOT EXISTS timeline_items (
  -- Core identification
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('task', 'activity', 'routine', 'habit', 'memory')),
  
  -- Basic information
  title TEXT NOT NULL,
  description TEXT,
  
  -- Time-related fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  
  -- Organization
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- Common status and priority
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- User ownership
  user_id UUID NOT NULL,
  
  -- Flexible metadata storage
  metadata JSONB DEFAULT '{}' NOT NULL,
  
  -- Constraints
  UNIQUE(id, type)
);

-- Main tasks table with subtasks support (subtype of timeline_items)
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
  completed_subtask_count INTEGER DEFAULT 0,
  
  -- Supertype/subtype relationship
  type TEXT DEFAULT 'task' CHECK (type = 'task'),
  FOREIGN KEY (id, type) REFERENCES timeline_items(id, type) ON DELETE CASCADE
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

-- Universal time tracking entries table
-- Works with all timeline_items types
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Link to timeline_items (supertype)
  timeline_item_id UUID NOT NULL REFERENCES timeline_items(id) ON DELETE CASCADE,
  
  -- Time tracking fields
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  source TEXT DEFAULT 'timer' CHECK (source IN ('timer','manual','import')),
  note TEXT,
  
  -- Snapshot fields for query performance
  timeline_item_type TEXT NOT NULL,
  timeline_item_title TEXT,
  category_id_snapshot UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT te_time_order_chk CHECK (end_at IS NULL OR end_at > start_at)
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

-- Timeline items indexes
CREATE INDEX IF NOT EXISTS idx_timeline_items_user_id ON timeline_items(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_items_type ON timeline_items(type);
CREATE INDEX IF NOT EXISTS idx_timeline_items_user_type ON timeline_items(user_id, type);
CREATE INDEX IF NOT EXISTS idx_timeline_items_status ON timeline_items(status);
CREATE INDEX IF NOT EXISTS idx_timeline_items_created_at ON timeline_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_items_end_time ON timeline_items(end_time);
CREATE INDEX IF NOT EXISTS idx_timeline_items_tags ON timeline_items USING GIN(tags);

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

-- Universal time entries indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_user_timeline_item ON time_entries(user_id, timeline_item_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_type ON time_entries(user_id, timeline_item_type);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_start ON time_entries(user_id, start_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_running_timer_time_entries ON time_entries(user_id) WHERE end_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date_type ON time_entries(
  user_id, 
  DATE(start_at AT TIME ZONE 'UTC'), 
  timeline_item_type
);



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

-- =====================================================
-- 4.1 TIMELINE ITEMS ARCHITECTURE FUNCTIONS
-- =====================================================

-- Supertype/subtype synchronization functions
CREATE OR REPLACE FUNCTION sync_task_to_timeline_item_before()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Ensure user_id is set
    target_user_id := COALESCE(NEW.user_id, auth.uid());
    
    IF target_user_id IS NULL THEN
      RAISE EXCEPTION 'user_id cannot be null. Either provide user_id explicitly or ensure proper authentication context.';
    END IF;
    
    -- Update NEW record if user_id was null
    IF NEW.user_id IS NULL THEN
      NEW.user_id := target_user_id;
    END IF;
    
    -- Create corresponding timeline_items record
    INSERT INTO timeline_items (
      id, type, title, description, created_at, updated_at,
      end_time, category_id, tags, status, priority, user_id, metadata
    ) VALUES (
      NEW.id, 'task', NEW.title, NEW.description, NEW.created_at, NEW.updated_at,
      NEW.due_date, NEW.category_id, NEW.tags,
      CASE NEW.status
        WHEN 'pending' THEN 'active'
        WHEN 'in_progress' THEN 'active'
        WHEN 'completed' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'on_hold' THEN 'inactive'
        ELSE 'active'
      END,
      NEW.priority, target_user_id,
      jsonb_build_object(
        'estimated_duration', NEW.estimated_duration,
        'progress', NEW.progress,
        'assignee', NEW.assignee
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_task_to_timeline_item_after()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Sync changes to timeline_items
    UPDATE timeline_items SET
      title = NEW.title,
      description = NEW.description,
      updated_at = NEW.updated_at,
      end_time = NEW.due_date,
      category_id = NEW.category_id,
      tags = NEW.tags,
      status = CASE NEW.status
        WHEN 'pending' THEN 'active'
        WHEN 'in_progress' THEN 'active'
        WHEN 'completed' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'on_hold' THEN 'inactive'
        ELSE 'active'
      END,
      priority = NEW.priority,
      metadata = metadata || jsonb_build_object(
        'estimated_duration', NEW.estimated_duration,
        'progress', NEW.progress,
        'assignee', NEW.assignee
      )
    WHERE id = NEW.id AND type = 'task';
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Delete corresponding timeline_items record
    DELETE FROM timeline_items WHERE id = OLD.id AND type = 'task';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Time entries snapshot management
CREATE OR REPLACE FUNCTION set_timeline_item_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set snapshots on INSERT to avoid update loops
  IF TG_OP = 'INSERT' THEN
    SELECT type, title, category_id INTO 
      NEW.timeline_item_type, 
      NEW.timeline_item_title, 
      NEW.category_id_snapshot
    FROM timeline_items 
    WHERE id = NEW.timeline_item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Time entries cache update (avoid infinite recursion)
CREATE OR REPLACE FUNCTION update_task_time_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process task-type timeline_items
  IF COALESCE(NEW.timeline_item_type, OLD.timeline_item_type) != 'task' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF TG_OP = 'INSERT' AND NEW.end_at IS NOT NULL THEN
    UPDATE tasks 
    SET 
      tracked_minutes_total = tracked_minutes_total + COALESCE(NEW.duration_minutes, 0),
      tracked_segments_count = tracked_segments_count + 1
    WHERE id = NEW.timeline_item_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- From running to completed
    IF (OLD.end_at IS NULL) AND (NEW.end_at IS NOT NULL) THEN
      UPDATE tasks
      SET tracked_minutes_total = tracked_minutes_total + COALESCE(NEW.duration_minutes, 0),
          tracked_segments_count = tracked_segments_count + 1
      WHERE id = NEW.timeline_item_id;
      
    -- Modify completed entry
    ELSIF (OLD.end_at IS NOT NULL) AND (NEW.end_at IS NOT NULL) THEN
      UPDATE tasks
      SET tracked_minutes_total = tracked_minutes_total + 
          (COALESCE(NEW.duration_minutes,0) - COALESCE(OLD.duration_minutes,0))
      WHERE id = NEW.timeline_item_id;
      
    -- From completed back to running
    ELSIF (OLD.end_at IS NOT NULL) AND (NEW.end_at IS NULL) THEN
      UPDATE tasks
      SET tracked_minutes_total = GREATEST(0, tracked_minutes_total - COALESCE(OLD.duration_minutes,0)),
          tracked_segments_count = GREATEST(0, tracked_segments_count - 1)
      WHERE id = OLD.timeline_item_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' AND OLD.end_at IS NOT NULL THEN
    UPDATE tasks
    SET tracked_minutes_total = GREATEST(0, tracked_minutes_total - COALESCE(OLD.duration_minutes,0)),
        tracked_segments_count = GREATEST(0, tracked_segments_count - 1)
    WHERE id = OLD.timeline_item_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Utility function to sync time_entries snapshots
CREATE OR REPLACE FUNCTION sync_time_entries_snapshots(timeline_item_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
  item_title TEXT;
  item_type TEXT;
BEGIN
  -- Get latest timeline_item information
  SELECT title, type INTO item_title, item_type
  FROM timeline_items 
  WHERE id = timeline_item_id;
  
  -- Update related time_entries snapshots
  UPDATE time_entries 
  SET 
    timeline_item_title = item_title,
    timeline_item_type = item_type,
    updated_at = NOW()
  WHERE timeline_item_id = sync_time_entries_snapshots.timeline_item_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Data migration functions
CREATE OR REPLACE FUNCTION backfill_tasks_to_timeline_items()
RETURNS TABLE(migrated_count INTEGER, skipped_count INTEGER, error_count INTEGER) AS $$
DECLARE
  migrated INTEGER := 0;
  skipped INTEGER := 0;
  errors INTEGER := 0;
  task_record RECORD;
BEGIN
  FOR task_record IN 
    SELECT * FROM tasks 
    ORDER BY created_at 
  LOOP
    BEGIN
      -- Check if already exists
      IF EXISTS (SELECT 1 FROM timeline_items WHERE id = task_record.id) THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      
      -- Insert to timeline_items
      INSERT INTO timeline_items (
        id, type, title, description, created_at, updated_at,
        end_time, category_id, tags, status, priority, user_id, metadata
      ) VALUES (
        task_record.id,
        'task',
        task_record.title,
        task_record.description,
        task_record.created_at,
        task_record.updated_at,
        task_record.due_date,
        task_record.category_id,
        task_record.tags,
        CASE task_record.status
          WHEN 'pending' THEN 'active'
          WHEN 'in_progress' THEN 'active'
          WHEN 'completed' THEN 'completed'
          WHEN 'cancelled' THEN 'cancelled'
          WHEN 'on_hold' THEN 'inactive'
          ELSE 'active'
        END,
        task_record.priority,
        task_record.user_id,
        jsonb_build_object(
          'estimated_duration', task_record.estimated_duration,
          'progress', task_record.progress,
          'assignee', task_record.assignee
        )
      );
      
      migrated := migrated + 1;
      
    EXCEPTION WHEN OTHERS THEN
      errors := errors + 1;
      RAISE WARNING 'Failed to migrate task %: %', task_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT migrated, skipped, errors;
END;
$$ LANGUAGE plpgsql;



-- =====================================================
-- 4.2 ENERGY DAY FUNCTIONS
-- =====================================================

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

-- =====================================================
-- 4.3 TIME TRACKING FUNCTIONS
-- =====================================================

-- Duration calculation function (shared by all time entry tables)
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

CREATE TRIGGER update_energy_day_updated_at
  BEFORE UPDATE ON energy_day
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timeline_items_updated_at 
  BEFORE UPDATE ON timeline_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at 
  BEFORE UPDATE ON time_entries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5.1 TIMELINE ITEMS ARCHITECTURE TRIGGERS
-- =====================================================

-- Tasks <-> timeline_items synchronization
CREATE TRIGGER trg_sync_task_to_timeline_before_insert
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_to_timeline_item_before();

CREATE TRIGGER trg_sync_task_to_timeline_after_update_delete
  AFTER UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_to_timeline_item_after();

-- Time entries management
CREATE TRIGGER trg_set_timeline_snapshot
  BEFORE INSERT ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_timeline_item_snapshot();

-- Duration calculation for time_entries
CREATE TRIGGER trg_time_entries_finalize_duration
  BEFORE INSERT OR UPDATE OF end_at ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION finalize_duration_minutes();

CREATE TRIGGER trg_update_task_time_cache
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_task_time_cache();

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
ALTER TABLE timeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

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

-- Timeline items policies
CREATE POLICY "Users can view their own timeline items" ON timeline_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own timeline items" ON timeline_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline items" ON timeline_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline items" ON timeline_items
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

-- Universal time entries policies
CREATE POLICY "Users can view their entries" ON time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their entries" ON time_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND timeline_item_id IN (SELECT id FROM timeline_items WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can modify their entries" ON time_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their entries" ON time_entries
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
-- 8. MIGRATION NOTES
-- =====================================================

-- Timeline Items Architecture Summary:
-- 1. timeline_items: Supertype table for all time-related entities
-- 2. tasks: Subtype table (existing structure preserved)
-- 3. time_entries: Universal time tracking
-- 4. Automatic synchronization between supertype and subtypes
-- 5. Optimized queries with snapshot fields

-- Migration completed:
-- ✅ Tasks data backfilled to timeline_items
-- ✅ Time entries migrated to universal time_entries table  
-- ✅ Application APIs updated
-- ✅ Legacy tables cleaned up

-- =====================================================
-- SCHEMA VERSION 2.0.0 COMPLETE
-- =====================================================