# Database Coding Regulations

## Overview

ZephyrOS uses Supabase (PostgreSQL 15+) as its database platform. This document defines the standards, patterns, and best practices for database schema design, queries, migrations, and data integrity.

**Technology Stack:**
- Supabase (PostgreSQL 15+)
- Row Level Security (RLS)
- PL/pgSQL for stored procedures
- JSONB for flexible metadata
- GiST indexes for range types

## Schema Design Principles

### 1. **Table Naming Conventions**

```sql
-- ✅ Good: Plural nouns, snake_case
CREATE TABLE tasks (...);
CREATE TABLE time_entries (...);
CREATE TABLE memory_anchors (...);

-- ❌ Bad: Singular, camelCase, prefixes
CREATE TABLE task (...);
CREATE TABLE TimeEntries (...);
CREATE TABLE tbl_memory_anchors (...);
```

### 2. **Column Naming**

```sql
-- ✅ Good: snake_case, descriptive, consistent
id UUID PRIMARY KEY
user_id UUID NOT NULL
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

-- ❌ Bad: camelCase, abbreviations, inconsistent
ID uuid
userId uuid
createdDate timestamp
lastModified timestamp
```

### 3. **Primary Keys**

**Always use UUIDs for primary keys:**

```sql
-- ✅ Good: UUID primary key with default
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- other columns
);

-- ❌ Bad: Auto-incrementing integer
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  -- other columns
);
```

**Reasons:**
- Distributed-friendly (no conflicts across databases)
- Secure (non-guessable IDs)
- Better for public APIs
- Compatible with Supabase best practices

### 4. **Foreign Keys and Referential Integrity**

```sql
-- ✅ Good: Explicit foreign keys with appropriate actions
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
);

-- ❌ Bad: No referential integrity
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  category_id UUID,  -- No foreign key constraint!
  user_id UUID,      -- No NOT NULL constraint!
);
```

**CASCADE Rules:**
- `ON DELETE CASCADE`: Child data should be deleted (e.g., subtasks when parent deleted)
- `ON DELETE SET NULL`: Relationship should be preserved (e.g., category deleted, tasks remain)
- `ON DELETE RESTRICT`: Prevent deletion if referenced (rarely used)

### 5. **Timestamps**

**Every table must have creation and update timestamps:**

```sql
CREATE TABLE example (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- ... other columns ...
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create trigger for automatic updated_at management
CREATE TRIGGER update_example_updated_at
  BEFORE UPDATE ON example
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Always use `TIMESTAMP WITH TIME ZONE` for temporal data!**

### 6. **Flexible Metadata with JSONB**

Use JSONB for flexible, schema-less data:

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  -- ... structured columns ...
  metadata JSONB DEFAULT '{}' NOT NULL
);

-- ✅ Good: Use JSONB for optional, varying metadata
UPDATE tasks
SET metadata = metadata || jsonb_build_object(
  'estimated_duration', 120,
  'tags', ARRAY['urgent', 'client']
)
WHERE id = task_id;

-- ✅ Good: Query JSONB fields
SELECT * FROM tasks
WHERE metadata->>'priority' = 'high';

-- ✅ Good: Create GIN index for JSONB queries
CREATE INDEX idx_tasks_metadata ON tasks USING GIN(metadata);
```

### 7. **Constraints and Validation**

**Always validate data at the database level:**

```sql
-- ✅ Good: Comprehensive constraints
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (LENGTH(title) > 0 AND LENGTH(title) <= 500),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  progress INTEGER DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE
    CHECK (due_date IS NULL OR due_date > created_at),
  user_id UUID NOT NULL,

  -- Unique constraints
  UNIQUE(title, user_id) -- No duplicate task titles per user
);

-- ❌ Bad: No validation
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  title TEXT,           -- No length limit, can be empty
  status TEXT,          -- Any value allowed
  progress INTEGER      -- Could be negative or > 100
);
```

### 8. **Custom Domain Types**

For frequently used constrained types, create custom domains:

```sql
-- ✅ Good: Domain for constrained values
CREATE DOMAIN energy_level AS SMALLINT
CHECK (VALUE BETWEEN 1 AND 10);

CREATE TABLE energy_day (
  user_id UUID NOT NULL,
  local_date DATE NOT NULL,
  curve energy_level[] NOT NULL,
  -- ensures all values in array are 1-10
);
```

## Index Strategy

### 1. **Primary Index Types**

```sql
-- B-tree (default) - For equality and range queries
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);

-- GIN - For array, JSONB, full-text search
CREATE INDEX idx_tasks_tags ON tasks USING GIN(tags);
CREATE INDEX idx_timeline_metadata ON timeline_items USING GIN(metadata);

-- GiST - For geometric, range types
CREATE INDEX idx_memories_happened_range ON memories USING GIST(happened_range);
CREATE INDEX idx_anchors_time_range ON memory_anchors USING GIST(local_time_range);

-- Partial indexes - For filtered queries
CREATE INDEX idx_memories_highlights
  ON memories(user_id, salience_score DESC)
  WHERE is_highlight = true;

CREATE UNIQUE INDEX uniq_user_running_timer
  ON time_entries(user_id)
  WHERE end_at IS NULL;
```

### 2. **Composite Indexes**

**Order matters! Most selective column first:**

```sql
-- ✅ Good: Specific to general
CREATE INDEX idx_tasks_user_status_priority
  ON tasks(user_id, status, priority);

-- ✅ Good: Include sort column last
CREATE INDEX idx_tasks_user_created
  ON tasks(user_id, created_at DESC);

-- ❌ Bad: Wrong order for typical query patterns
CREATE INDEX idx_tasks_priority_user
  ON tasks(priority, user_id);
-- Won't be used for "WHERE user_id = X" queries
```

### 3. **Index Maintenance**

```sql
-- Check for unused indexes (run periodically)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Analyze table statistics after large data changes
ANALYZE tasks;

-- Reindex if needed
REINDEX TABLE tasks;
```

## Row Level Security (RLS)

### 1. **Always Enable RLS**

**Every user-data table MUST have RLS enabled:**

```sql
-- ✅ Required for all user tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);
```

### 2. **RLS for Related Data**

```sql
-- ✅ Good: Check ownership through joins
CREATE POLICY "Users can view their memory anchors"
  ON memory_anchors FOR SELECT
  USING (
    memory_id IN (
      SELECT id FROM memories WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert memory anchors"
  ON memory_anchors FOR INSERT
  WITH CHECK (
    memory_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
    AND anchor_item_id IN (SELECT id FROM timeline_items WHERE user_id = auth.uid())
  );
```

### 3. **Service Role Bypass**

```sql
-- Use service role only for admin operations
-- Never use service role for user-facing queries!

-- Service role bypasses RLS for system operations
-- Example: Background jobs, migrations, analytics
```

## Stored Functions and Triggers

### 1. **Trigger Functions Pattern**

```sql
-- ✅ Good: Clear, focused trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. **Complex Business Logic in Functions**

```sql
-- ✅ Good: Encapsulate complex logic in functions
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

  -- Return early if manual
  IF task_progress_calc = 'manual' THEN
    SELECT progress INTO calculated_progress FROM tasks WHERE id = task_id;
    RETURN calculated_progress;
  END IF;

  -- Calculate from subtasks
  SELECT COUNT(*), COALESCE(SUM(progress), 0)
  INTO subtask_count, total_progress
  FROM tasks
  WHERE parent_task_id = task_id;

  IF subtask_count = 0 THEN
    SELECT progress INTO calculated_progress FROM tasks WHERE id = task_id;
    RETURN calculated_progress;
  END IF;

  -- Average subtasks progress
  calculated_progress := total_progress / subtask_count;
  RETURN LEAST(100, GREATEST(0, calculated_progress));
END;
$$ LANGUAGE plpgsql;
```

### 3. **Recursive Queries for Hierarchies**

```sql
-- ✅ Good: Use WITH RECURSIVE for tree structures
CREATE OR REPLACE FUNCTION get_subtask_tree(
  root_task_id UUID,
  max_depth INTEGER DEFAULT 5
)
RETURNS TABLE (
  task_id UUID,
  parent_task_id UUID,
  title TEXT,
  hierarchy_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subtask_tree AS (
    -- Base case: root task
    SELECT
      t.id, t.parent_task_id, t.title, t.hierarchy_level
    FROM tasks t
    WHERE t.id = root_task_id

    UNION ALL

    -- Recursive case: children
    SELECT
      t.id, t.parent_task_id, t.title, t.hierarchy_level
    FROM tasks t
    INNER JOIN subtask_tree st ON t.parent_task_id = st.task_id
    WHERE st.hierarchy_level < max_depth
  )
  SELECT * FROM subtask_tree
  ORDER BY hierarchy_level, subtask_order;
END;
$$ LANGUAGE plpgsql;
```

## Data Integrity Patterns

### 1. **Supertype/Subtype Architecture**

ZephyrOS uses a sophisticated supertype/subtype pattern for timeline items:

```sql
-- Supertype table
CREATE TABLE timeline_items (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('task', 'activity', 'memory')),
  title TEXT NOT NULL,
  -- Common fields...
  UNIQUE(id, type)  -- Critical for foreign keys!
);

-- Subtype table
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  -- Task-specific fields...
  type TEXT DEFAULT 'task' CHECK (type = 'task'),

  -- Foreign key to supertype
  FOREIGN KEY (id, type)
    REFERENCES timeline_items(id, type)
    ON DELETE CASCADE
);

-- Synchronization triggers (BEFORE for INSERT, AFTER for UPDATE/DELETE)
CREATE TRIGGER sync_task_before_insert
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_to_timeline_item_before();

CREATE TRIGGER sync_task_after_update_delete
  AFTER UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_to_timeline_item_after();
```

### 2. **Maintain Cached Counts**

```sql
-- ✅ Good: Maintain counts for performance
CREATE TRIGGER trg_update_subtask_counts
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_subtask_counts();

-- Function keeps counts synchronized
CREATE OR REPLACE FUNCTION update_subtask_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tasks
    SET subtask_count = subtask_count + 1
    WHERE id = NEW.parent_task_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tasks
    SET subtask_count = subtask_count - 1
    WHERE id = OLD.parent_task_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

### 3. **Prevent Invalid States**

```sql
-- ✅ Good: Enforce business rules in database
CREATE OR REPLACE FUNCTION prevent_memory_time_entries()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM timeline_items
    WHERE id = NEW.timeline_item_id AND type = 'memory'
  ) THEN
    RAISE EXCEPTION 'Cannot create time entries for memory items';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_memory_time_entries
  BEFORE INSERT ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_memory_time_entries();
```

## Query Optimization

### 1. **Use EXPLAIN ANALYZE**

```sql
-- Always profile slow queries
EXPLAIN ANALYZE
SELECT t.*, c.name as category_name
FROM tasks t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.user_id = 'user-uuid'
  AND t.status = 'pending'
ORDER BY t.created_at DESC
LIMIT 50;

-- Look for:
-- - Sequential scans (should be index scans)
-- - High cost numbers
-- - Slow actual time
```

### 2. **Efficient Pagination**

```sql
-- ✅ Good: Use keyset pagination for large datasets
SELECT * FROM tasks
WHERE user_id = $1
  AND created_at < $2  -- Last seen created_at
ORDER BY created_at DESC
LIMIT 50;

-- ❌ Bad: OFFSET pagination (slow for large offsets)
SELECT * FROM tasks
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 50 OFFSET 1000;  -- Gets slower as offset increases
```

### 3. **Aggregate Queries**

```sql
-- ✅ Good: Use window functions for running totals
SELECT
  date_trunc('day', created_at) as day,
  COUNT(*) as tasks_created,
  SUM(COUNT(*)) OVER (ORDER BY date_trunc('day', created_at)) as cumulative_tasks
FROM tasks
WHERE user_id = $1
GROUP BY day
ORDER BY day DESC;

-- ✅ Good: Materialized views for expensive aggregations
CREATE MATERIALIZED VIEW task_statistics AS
SELECT
  user_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
  AVG(tracked_minutes_total) as avg_time_per_task
FROM tasks
GROUP BY user_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW task_statistics;
```

## Migration Best Practices

### 1. **Version Control for Migrations**

```sql
-- File naming: YYYY-MM-DD-description.sql
-- Example: 2025-09-15-add-seasons-table.sql

-- Always start with a comment
-- =====================================================
-- Migration: Add Seasons and Episodes Tables
-- Date: 2025-09-15
-- Description: Implements narrative seasons feature
-- =====================================================

-- Use IF NOT EXISTS for safety
CREATE TABLE IF NOT EXISTS seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- columns...
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seasons_user_id ON seasons(user_id);
```

### 2. **Safe Schema Changes**

```sql
-- ✅ Good: Add column with default (non-blocking)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS is_ai_task BOOLEAN DEFAULT false NOT NULL;

-- ✅ Good: Add index concurrently (non-blocking in production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_ai
ON tasks(user_id, is_ai_task);

-- ❌ Bad: Rename column (breaks existing code!)
ALTER TABLE tasks RENAME COLUMN old_name TO new_name;
-- Use deprecation + new column pattern instead

-- ✅ Good: Backward-compatible column addition
ALTER TABLE tasks ADD COLUMN new_column TEXT;
UPDATE tasks SET new_column = old_column;  -- Backfill
-- Later: Drop old_column after code deployment
```

### 3. **Data Migrations**

```sql
-- ✅ Good: Batch updates for large tables
DO $$
DECLARE
  batch_size INTEGER := 1000;
  processed INTEGER := 0;
BEGIN
  LOOP
    WITH updated AS (
      UPDATE tasks
      SET metadata = metadata || jsonb_build_object('migrated', true)
      WHERE id IN (
        SELECT id FROM tasks
        WHERE NOT (metadata ? 'migrated')
        LIMIT batch_size
      )
      RETURNING id
    )
    SELECT COUNT(*) INTO processed FROM updated;

    EXIT WHEN processed = 0;

    RAISE NOTICE 'Processed % rows', processed;
    COMMIT;  -- Release locks between batches
  END LOOP;
END $$;
```

## Monitoring and Maintenance

### 1. **Query Performance Monitoring**

```sql
-- Find slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Find table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. **Regular Maintenance**

```sql
-- Vacuum and analyze (do this periodically)
VACUUM ANALYZE tasks;

-- Reindex if fragmented
REINDEX TABLE CONCURRENTLY tasks;

-- Update statistics
ANALYZE tasks;
```

## Security Best Practices

### 1. **Never Store Sensitive Data Unencrypted**

```sql
-- ❌ Bad: Storing sensitive data in plain text
CREATE TABLE users (
  id UUID PRIMARY KEY,
  ssn TEXT,  -- DON'T DO THIS
  credit_card TEXT  -- NEVER!
);

-- ✅ Good: Use Supabase auth for sensitive user data
-- Or encrypt at application level before storing
```

### 2. **Audit Logging**

```sql
-- ✅ Good: Create audit log table
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, user_id, old_data, new_data)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.user_id, OLD.user_id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Common Patterns Reference

### 1. **Soft Deletes**

```sql
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Filter out deleted items
CREATE VIEW active_tasks AS
SELECT * FROM tasks WHERE deleted_at IS NULL;

-- Index for performance
CREATE INDEX idx_tasks_not_deleted
ON tasks(user_id, status)
WHERE deleted_at IS NULL;
```

### 2. **Versioning**

```sql
CREATE TABLE task_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id),
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  UNIQUE(task_id, version)
);
```

### 3. **Full-Text Search**

```sql
-- Add tsvector column
ALTER TABLE tasks
ADD COLUMN search_vector tsvector;

-- Update trigger
CREATE TRIGGER tasks_search_vector_update
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(
    search_vector, 'pg_catalog.english',
    title, description
  );

-- GIN index for fast search
CREATE INDEX idx_tasks_search
ON tasks USING GIN(search_vector);

-- Query
SELECT * FROM tasks
WHERE search_vector @@ to_tsquery('english', 'urgent & meeting');
```

---

**Last Updated**: 2025-10-10
**Component**: Database (Supabase/PostgreSQL)
**Schema Version**: 2.1.0
