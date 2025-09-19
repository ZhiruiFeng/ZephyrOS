-- =====================================================
-- Migration: Add is_ai_task field to tasks table
-- Date: 2025-01-15
-- Description: Add boolean field to mark AI-generated tasks
-- =====================================================

-- Add is_ai_task column to tasks table
ALTER TABLE tasks 
ADD COLUMN is_ai_task BOOLEAN DEFAULT false NOT NULL;

-- Add index for performance on AI task queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_ai_task ON tasks(is_ai_task);

-- Add index for combined user and AI task queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_ai_task ON tasks(user_id, is_ai_task);

-- Update the sync function to include is_ai_task in metadata
CREATE OR REPLACE FUNCTION sync_task_to_timeline_item_before()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Ensure id is set (generate if null due to DEFAULT)
    IF NEW.id IS NULL THEN
      NEW.id := gen_random_uuid();
    END IF;
    
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
        'assignee', NEW.assignee,
        'is_ai_task', NEW.is_ai_task
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the sync function to include is_ai_task in metadata updates
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
        'assignee', NEW.assignee,
        'is_ai_task', NEW.is_ai_task
      )
    WHERE id = NEW.id AND type = 'task';
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Delete corresponding timeline_items record
    DELETE FROM timeline_items WHERE id = OLD.id AND type = 'task';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Update the backfill function to include is_ai_task
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
          'assignee', task_record.assignee,
          'is_ai_task', COALESCE(task_record.is_ai_task, false)
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

-- Add comment to the new column
COMMENT ON COLUMN tasks.is_ai_task IS 'Indicates whether this task is assigned to anAI (true) or created to a user (false)';
