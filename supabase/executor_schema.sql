-- =====================================================
-- EXECUTOR SYSTEM SCHEMA
-- Version: 1.0.0
-- Created: 2025-10-02
-- Description: Agent workspace management with multi-device support
-- =====================================================

-- =====================================================
-- 1. EXECUTOR DEVICES TABLE
-- =====================================================

CREATE TABLE executor_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User ownership
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Device identification
  device_name TEXT NOT NULL, -- User-friendly name (e.g., "MacBook Pro M2")
  device_id TEXT NOT NULL, -- Unique hardware identifier (e.g., UUID from device)
  platform TEXT NOT NULL, -- 'macos', 'linux', 'windows'
  os_version TEXT,
  executor_version TEXT, -- Version of executor app

  -- Configuration
  root_workspace_path TEXT NOT NULL, -- Base path for all workspaces on this device
  max_concurrent_workspaces INTEGER DEFAULT 3
    CHECK (max_concurrent_workspaces >= 1 AND max_concurrent_workspaces <= 10),
  max_disk_usage_gb INTEGER DEFAULT 50
    CHECK (max_disk_usage_gb >= 1 AND max_disk_usage_gb <= 500),

  -- Default settings
  default_shell TEXT DEFAULT '/bin/zsh', -- Default shell path
  default_timeout_minutes INTEGER DEFAULT 30,
  allowed_commands TEXT[], -- Global command whitelist for this device
  environment_vars JSONB DEFAULT '{}', -- Default environment variables

  -- System prompt configuration
  system_prompt TEXT, -- Default system prompt for Claude Code on this device
  claude_code_path TEXT, -- Path to Claude Code installation

  -- Capabilities
  features TEXT[] DEFAULT '{}', -- Supported features: ['git', 'docker', 'node', 'python']

  -- Status
  status TEXT DEFAULT 'inactive'
    CHECK (status IN ('active', 'inactive', 'maintenance', 'disabled')),
  is_online BOOLEAN DEFAULT false,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE,

  -- Resource tracking (current state)
  current_workspaces_count INTEGER DEFAULT 0,
  current_disk_usage_gb REAL DEFAULT 0,

  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_online_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  UNIQUE(user_id, device_id),
  UNIQUE(user_id, device_name)
);

-- =====================================================
-- 2. EXECUTOR AGENT WORKSPACES TABLE
-- =====================================================

CREATE TABLE executor_agent_workspaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relationships
  executor_device_id UUID NOT NULL REFERENCES executor_devices(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_agents(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Workspace location (on executor device)
  workspace_path TEXT NOT NULL, -- Full path on device (must start with root_workspace_path)
  relative_path TEXT NOT NULL, -- Relative to root_workspace_path
  metadata_path TEXT, -- Path to .zephyr metadata folder

  -- Project configuration
  repo_url TEXT, -- Git repository URL
  repo_branch TEXT DEFAULT 'main',
  project_type TEXT, -- 'swift', 'python', 'nodejs', 'go', 'rust', 'generic'
  project_name TEXT,

  -- Execution configuration
  allowed_commands TEXT[], -- Workspace-specific command whitelist (overrides device default)
  environment_vars JSONB DEFAULT '{}', -- Workspace-specific env vars
  system_prompt TEXT, -- Workspace-specific system prompt for Claude Code
  execution_timeout_minutes INTEGER DEFAULT 30,

  -- Isolation settings
  enable_network BOOLEAN DEFAULT true,
  enable_git BOOLEAN DEFAULT true,
  max_disk_usage_mb INTEGER DEFAULT 5000, -- 5GB default per workspace

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'creating'
    CHECK (status IN (
      'creating',      -- Initial creation
      'initializing',  -- Setting up directories
      'cloning',       -- Cloning repository
      'ready',         -- Ready for task assignment
      'assigned',      -- Task assigned, waiting to start
      'running',       -- Currently executing task
      'paused',        -- Execution paused
      'completed',     -- Task completed successfully
      'failed',        -- Task failed
      'archived',      -- Workspace archived
      'cleanup'        -- Being cleaned up
    )),

  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0
    CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  current_phase TEXT, -- e.g., 'cloning_repo', 'executing_prompt', 'parsing_results'
  current_step TEXT, -- Detailed current step
  last_heartbeat_at TIMESTAMP WITH TIME ZONE,

  -- Resource tracking
  disk_usage_bytes BIGINT DEFAULT 0,
  file_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  initialized_at TIMESTAMP WITH TIME ZONE,
  ready_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(executor_device_id, workspace_path),
  UNIQUE(executor_device_id, relative_path)
);

-- =====================================================
-- 3. EXECUTOR WORKSPACE TASKS (Junction Table)
-- =====================================================

CREATE TABLE executor_workspace_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relationships
  workspace_id UUID NOT NULL REFERENCES executor_agent_workspaces(id) ON DELETE CASCADE,
  ai_task_id UUID NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Task assignment
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Execution details
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN (
      'assigned',      -- Task assigned to workspace
      'queued',        -- In execution queue
      'starting',      -- Starting execution
      'running',       -- Currently running
      'paused',        -- Execution paused
      'completed',     -- Completed successfully
      'failed',        -- Execution failed
      'timeout',       -- Timed out
      'cancelled'      -- Cancelled by user
    )),

  -- Task-specific configuration
  prompt_file_path TEXT, -- Path to prompt file in workspace
  output_file_path TEXT, -- Expected output file path
  result_file_path TEXT, -- Actual result file path

  -- Execution results
  exit_code INTEGER,
  output_summary TEXT,
  error_message TEXT,

  -- Resource usage for this specific task execution
  execution_duration_seconds INTEGER,
  cpu_time_seconds INTEGER,
  memory_peak_mb INTEGER,

  -- Cost tracking
  estimated_cost_usd DECIMAL(10,4),
  actual_cost_usd DECIMAL(10,4),

  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(workspace_id, ai_task_id) -- One task per workspace at a time
);

-- =====================================================
-- 4. EXECUTOR WORKSPACE EVENTS
-- =====================================================

CREATE TABLE executor_workspace_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relationships
  workspace_id UUID NOT NULL REFERENCES executor_agent_workspaces(id) ON DELETE CASCADE,
  workspace_task_id UUID REFERENCES executor_workspace_tasks(id) ON DELETE CASCADE,
  executor_device_id UUID NOT NULL REFERENCES executor_devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'workspace_created', 'repo_cloned', 'task_assigned', 'prompt_sent', etc.
  event_category TEXT DEFAULT 'info'
    CHECK (event_category IN ('lifecycle', 'task', 'error', 'resource', 'system')),

  -- Event data
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}', -- Structured event data

  -- Severity
  level TEXT DEFAULT 'info'
    CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),

  -- Context
  source TEXT, -- Component that generated event (e.g., 'WorkspaceManager', 'ClaudeCodeAutomation')

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. EXECUTOR WORKSPACE ARTIFACTS
-- =====================================================

CREATE TABLE executor_workspace_artifacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relationships
  workspace_id UUID NOT NULL REFERENCES executor_agent_workspaces(id) ON DELETE CASCADE,
  workspace_task_id UUID REFERENCES executor_workspace_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File identification
  file_path TEXT NOT NULL, -- Relative to workspace root
  file_name TEXT NOT NULL,
  file_extension TEXT,

  -- File classification
  artifact_type TEXT NOT NULL
    CHECK (artifact_type IN (
      'source_code',      -- Generated/modified source code
      'config',           -- Configuration files
      'documentation',    -- README, docs, etc.
      'test',            -- Test files
      'build_output',    -- Compiled binaries, builds
      'log',             -- Log files
      'result',          -- Task result files (result.json, etc.)
      'prompt',          -- Prompt files sent to Claude
      'screenshot',      -- Screenshots/images
      'data',            -- Data files (CSV, JSON, etc.)
      'other'            -- Other artifacts
    )),

  -- File metadata
  file_size_bytes BIGINT,
  mime_type TEXT,
  checksum TEXT, -- SHA-256 hash for integrity

  -- Content storage
  storage_type TEXT DEFAULT 'reference'
    CHECK (storage_type IN (
      'reference',    -- Just path reference, file on device
      'inline',       -- Small file stored in DB
      'external'      -- Stored in external storage (S3, etc.)
    )),
  content TEXT, -- Actual content if storage_type = 'inline' and size < 1MB
  content_preview TEXT, -- First 1000 chars for preview
  external_url TEXT, -- URL if stored externally

  -- Analysis
  language TEXT, -- Programming language (auto-detected)
  line_count INTEGER,

  -- Categorization
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_output BOOLEAN DEFAULT false, -- True if this is a task output
  is_modified BOOLEAN DEFAULT false, -- True if modified from original

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_at TIMESTAMP WITH TIME ZONE,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(workspace_id, file_path)
);

-- =====================================================
-- 6. EXECUTOR WORKSPACE METRICS
-- =====================================================

CREATE TABLE executor_workspace_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relationships
  workspace_id UUID NOT NULL REFERENCES executor_agent_workspaces(id) ON DELETE CASCADE,
  workspace_task_id UUID REFERENCES executor_workspace_tasks(id) ON DELETE CASCADE,
  executor_device_id UUID NOT NULL REFERENCES executor_devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Resource metrics
  cpu_usage_percent REAL CHECK (cpu_usage_percent >= 0 AND cpu_usage_percent <= 100),
  memory_usage_mb INTEGER CHECK (memory_usage_mb >= 0),
  disk_usage_mb INTEGER CHECK (disk_usage_mb >= 0),
  disk_read_mb INTEGER DEFAULT 0,
  disk_write_mb INTEGER DEFAULT 0,
  network_in_mb INTEGER DEFAULT 0,
  network_out_mb INTEGER DEFAULT 0,

  -- Process metrics
  process_count INTEGER DEFAULT 0,
  thread_count INTEGER DEFAULT 0,
  open_files_count INTEGER DEFAULT 0,

  -- Performance metrics
  command_execution_count INTEGER DEFAULT 0,
  command_success_count INTEGER DEFAULT 0,
  command_failure_count INTEGER DEFAULT 0,
  avg_command_duration_ms INTEGER,

  -- Cost tracking
  cumulative_cost_usd DECIMAL(10,4) DEFAULT 0,

  -- Sampling metadata
  metric_type TEXT DEFAULT 'snapshot'
    CHECK (metric_type IN (
      'snapshot',     -- Point-in-time snapshot
      'aggregated',   -- Aggregated over time period
      'peak',         -- Peak values
      'average'       -- Average values
    )),
  aggregation_period_minutes INTEGER, -- For aggregated metrics

  -- Timestamp
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. INDEXES
-- =====================================================

-- Executor Devices
CREATE INDEX idx_executor_devices_user ON executor_devices(user_id);
CREATE INDEX idx_executor_devices_status ON executor_devices(status, user_id);
CREATE INDEX idx_executor_devices_online ON executor_devices(is_online, user_id);
CREATE INDEX idx_executor_devices_heartbeat ON executor_devices(last_heartbeat_at)
  WHERE is_online = true;

-- Executor Agent Workspaces
CREATE INDEX idx_executor_workspaces_device ON executor_agent_workspaces(executor_device_id);
CREATE INDEX idx_executor_workspaces_agent ON executor_agent_workspaces(agent_id);
CREATE INDEX idx_executor_workspaces_user ON executor_agent_workspaces(user_id);
CREATE INDEX idx_executor_workspaces_status ON executor_agent_workspaces(status, user_id);
CREATE INDEX idx_executor_workspaces_heartbeat ON executor_agent_workspaces(last_heartbeat_at)
  WHERE status IN ('running', 'assigned');
CREATE INDEX idx_executor_workspaces_created ON executor_agent_workspaces(created_at DESC);

-- Executor Workspace Tasks
CREATE INDEX idx_executor_workspace_tasks_workspace ON executor_workspace_tasks(workspace_id);
CREATE INDEX idx_executor_workspace_tasks_ai_task ON executor_workspace_tasks(ai_task_id);
CREATE INDEX idx_executor_workspace_tasks_user ON executor_workspace_tasks(user_id);
CREATE INDEX idx_executor_workspace_tasks_status ON executor_workspace_tasks(status, user_id);
CREATE INDEX idx_executor_workspace_tasks_assigned ON executor_workspace_tasks(assigned_at DESC);

-- Executor Workspace Events
CREATE INDEX idx_executor_events_workspace ON executor_workspace_events(workspace_id, created_at DESC);
CREATE INDEX idx_executor_events_task ON executor_workspace_events(workspace_task_id, created_at DESC);
CREATE INDEX idx_executor_events_device ON executor_workspace_events(executor_device_id, created_at DESC);
CREATE INDEX idx_executor_events_user ON executor_workspace_events(user_id, created_at DESC);
CREATE INDEX idx_executor_events_type ON executor_workspace_events(event_type);
CREATE INDEX idx_executor_events_level ON executor_workspace_events(level)
  WHERE level IN ('error', 'critical');
CREATE INDEX idx_executor_events_category ON executor_workspace_events(event_category);

-- Executor Workspace Artifacts
CREATE INDEX idx_executor_artifacts_workspace ON executor_workspace_artifacts(workspace_id);
CREATE INDEX idx_executor_artifacts_task ON executor_workspace_artifacts(workspace_task_id);
CREATE INDEX idx_executor_artifacts_user ON executor_workspace_artifacts(user_id);
CREATE INDEX idx_executor_artifacts_type ON executor_workspace_artifacts(artifact_type);
CREATE INDEX idx_executor_artifacts_output ON executor_workspace_artifacts(is_output)
  WHERE is_output = true;
CREATE INDEX idx_executor_artifacts_tags ON executor_workspace_artifacts USING GIN(tags);

-- Executor Workspace Metrics
CREATE INDEX idx_executor_metrics_workspace ON executor_workspace_metrics(workspace_id, recorded_at DESC);
CREATE INDEX idx_executor_metrics_task ON executor_workspace_metrics(workspace_task_id, recorded_at DESC);
CREATE INDEX idx_executor_metrics_device ON executor_workspace_metrics(executor_device_id, recorded_at DESC);
CREATE INDEX idx_executor_metrics_user ON executor_workspace_metrics(user_id, recorded_at DESC);
CREATE INDEX idx_executor_metrics_type ON executor_workspace_metrics(metric_type);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE executor_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE executor_agent_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE executor_workspace_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE executor_workspace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE executor_workspace_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE executor_workspace_metrics ENABLE ROW LEVEL SECURITY;

-- Executor Devices Policies
CREATE POLICY "Users can view their own executor devices"
  ON executor_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own executor devices"
  ON executor_devices FOR ALL
  USING (auth.uid() = user_id);

-- Executor Agent Workspaces Policies
CREATE POLICY "Users can view their own workspaces"
  ON executor_agent_workspaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own workspaces"
  ON executor_agent_workspaces FOR ALL
  USING (auth.uid() = user_id);

-- Executor Workspace Tasks Policies
CREATE POLICY "Users can view their workspace tasks"
  ON executor_workspace_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their workspace tasks"
  ON executor_workspace_tasks FOR ALL
  USING (auth.uid() = user_id);

-- Executor Workspace Events Policies
CREATE POLICY "Users can view their workspace events"
  ON executor_workspace_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create workspace events"
  ON executor_workspace_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Executor Workspace Artifacts Policies
CREATE POLICY "Users can view their workspace artifacts"
  ON executor_workspace_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their workspace artifacts"
  ON executor_workspace_artifacts FOR ALL
  USING (auth.uid() = user_id);

-- Executor Workspace Metrics Policies
CREATE POLICY "Users can view their workspace metrics"
  ON executor_workspace_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert workspace metrics"
  ON executor_workspace_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Update device heartbeat and online status
CREATE OR REPLACE FUNCTION update_executor_device_heartbeat(device_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE executor_devices
  SET
    last_heartbeat_at = NOW(),
    last_online_at = NOW(),
    is_online = true,
    updated_at = NOW()
  WHERE id = device_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark device as offline if no heartbeat in 2 minutes
CREATE OR REPLACE FUNCTION mark_stale_devices_offline()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE executor_devices
  SET
    is_online = false,
    updated_at = NOW()
  WHERE
    is_online = true
    AND last_heartbeat_at < NOW() - INTERVAL '2 minutes'
  RETURNING id INTO updated_count;

  RETURN COALESCE(updated_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get available workspace slots on a device
CREATE OR REPLACE FUNCTION get_available_workspace_slots(device_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  max_concurrent INTEGER;
  current_count INTEGER;
BEGIN
  SELECT max_concurrent_workspaces INTO max_concurrent
  FROM executor_devices
  WHERE id = device_uuid;

  SELECT COUNT(*) INTO current_count
  FROM executor_agent_workspaces
  WHERE
    executor_device_id = device_uuid
    AND status IN ('running', 'assigned', 'initializing');

  RETURN GREATEST(0, max_concurrent - current_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if workspace path is valid (under root)
CREATE OR REPLACE FUNCTION validate_workspace_path(
  device_uuid UUID,
  proposed_path TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  root_path TEXT;
BEGIN
  SELECT root_workspace_path INTO root_path
  FROM executor_devices
  WHERE id = device_uuid;

  RETURN proposed_path LIKE (root_path || '%');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get workspace resource usage summary
CREATE OR REPLACE FUNCTION get_workspace_resource_summary(workspace_uuid UUID)
RETURNS TABLE (
  total_disk_mb INTEGER,
  peak_memory_mb INTEGER,
  total_cpu_time_seconds INTEGER,
  total_artifacts INTEGER,
  total_events INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COALESCE(MAX(disk_usage_mb), 0)::INTEGER
     FROM executor_workspace_metrics
     WHERE workspace_id = workspace_uuid),
    (SELECT COALESCE(MAX(memory_usage_mb), 0)::INTEGER
     FROM executor_workspace_metrics
     WHERE workspace_id = workspace_uuid),
    (SELECT COALESCE(SUM(cpu_time_seconds), 0)::INTEGER
     FROM executor_workspace_tasks
     WHERE workspace_id = workspace_uuid),
    (SELECT COUNT(*)::INTEGER
     FROM executor_workspace_artifacts
     WHERE workspace_id = workspace_uuid),
    (SELECT COUNT(*)::INTEGER
     FROM executor_workspace_events
     WHERE workspace_id = workspace_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. TRIGGERS
-- =====================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_executor_devices_updated_at
  BEFORE UPDATE ON executor_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_executor_workspaces_updated_at
  BEFORE UPDATE ON executor_agent_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_executor_workspace_tasks_updated_at
  BEFORE UPDATE ON executor_workspace_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update device workspace count on workspace status change
CREATE OR REPLACE FUNCTION update_device_workspace_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment count if workspace becomes active
  IF NEW.status IN ('running', 'assigned', 'initializing')
     AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('running', 'assigned', 'initializing')) THEN
    UPDATE executor_devices
    SET current_workspaces_count = current_workspaces_count + 1
    WHERE id = NEW.executor_device_id;
  END IF;

  -- Decrement count if workspace becomes inactive
  IF TG_OP = 'UPDATE' AND
     OLD.status IN ('running', 'assigned', 'initializing') AND
     NEW.status NOT IN ('running', 'assigned', 'initializing') THEN
    UPDATE executor_devices
    SET current_workspaces_count = GREATEST(0, current_workspaces_count - 1)
    WHERE id = NEW.executor_device_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_device_workspace_count
  AFTER INSERT OR UPDATE ON executor_agent_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_device_workspace_count();

-- =====================================================
-- 11. VIEWS
-- =====================================================

-- Active workspaces summary
CREATE VIEW executor_active_workspaces AS
SELECT
  w.id,
  w.workspace_path,
  w.status,
  w.progress_percentage,
  w.current_phase,
  w.disk_usage_bytes,
  d.device_name,
  d.platform,
  a.name as agent_name,
  t.ai_task_id,
  t.status as task_status,
  w.created_at,
  w.last_heartbeat_at,
  w.user_id
FROM executor_agent_workspaces w
JOIN executor_devices d ON w.executor_device_id = d.id
JOIN ai_agents a ON w.agent_id = a.id
LEFT JOIN executor_workspace_tasks t ON w.id = t.workspace_id
WHERE w.status IN ('running', 'assigned', 'initializing', 'ready')
ORDER BY w.created_at DESC;

-- Device capacity overview
CREATE VIEW executor_device_capacity AS
SELECT
  d.id,
  d.device_name,
  d.status,
  d.is_online,
  d.max_concurrent_workspaces,
  d.current_workspaces_count,
  (d.max_concurrent_workspaces - d.current_workspaces_count) as available_slots,
  d.max_disk_usage_gb,
  d.current_disk_usage_gb,
  (d.max_disk_usage_gb - d.current_disk_usage_gb) as available_disk_gb,
  d.last_heartbeat_at,
  d.user_id
FROM executor_devices d
ORDER BY d.is_online DESC, available_slots DESC;

-- =====================================================
-- 12. COMMENTS
-- =====================================================

COMMENT ON TABLE executor_devices IS 'Registered executor devices/machines for running agent tasks';
COMMENT ON TABLE executor_agent_workspaces IS 'Isolated workspace directories for agent task execution';
COMMENT ON TABLE executor_workspace_tasks IS 'Junction table connecting workspaces to AI tasks';
COMMENT ON TABLE executor_workspace_events IS 'Detailed event log for workspace lifecycle and task execution';
COMMENT ON TABLE executor_workspace_artifacts IS 'Files and outputs generated during workspace execution';
COMMENT ON TABLE executor_workspace_metrics IS 'Resource usage metrics and performance data';

COMMENT ON COLUMN executor_devices.root_workspace_path IS 'Base directory for all workspaces on this device';
COMMENT ON COLUMN executor_devices.max_concurrent_workspaces IS 'Maximum number of simultaneous workspaces allowed';
COMMENT ON COLUMN executor_agent_workspaces.workspace_path IS 'Full absolute path to workspace (must be under root_workspace_path)';
COMMENT ON COLUMN executor_workspace_tasks.ai_task_id IS 'References the AI task being executed in this workspace';
COMMENT ON COLUMN executor_workspace_artifacts.storage_type IS 'How artifact is stored: reference (path only), inline (in DB), or external (S3/storage)';
