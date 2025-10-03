import { z } from 'zod';

// =====================================================
// EXECUTOR DEVICES SCHEMAS
// =====================================================

export const ExecutorDeviceCreateSchema = z.object({
  device_name: z.string().min(1).max(100),
  device_id: z.string().uuid(),
  platform: z.enum(['macos', 'linux', 'windows']),
  os_version: z.string().optional(),
  executor_version: z.string().optional(),
  root_workspace_path: z.string().min(1),
  max_concurrent_workspaces: z.number().int().min(1).max(10).default(3),
  max_disk_usage_gb: z.number().int().min(1).max(500).default(50),
  default_shell: z.string().default('/bin/zsh'),
  default_timeout_minutes: z.number().int().min(1).max(300).default(30),
  allowed_commands: z.array(z.string()).optional(),
  environment_vars: z.record(z.string()).optional(),
  system_prompt: z.string().optional(),
  claude_code_path: z.string().optional(),
  features: z.array(z.string()).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export const ExecutorDeviceUpdateSchema = ExecutorDeviceCreateSchema.partial();

export const ExecutorDeviceQuerySchema = z.object({
  status: z.enum(['active', 'inactive', 'maintenance', 'disabled']).optional(),
  is_online: z.boolean().optional(),
  platform: z.enum(['macos', 'linux', 'windows']).optional()
});

// =====================================================
// EXECUTOR WORKSPACES SCHEMAS
// =====================================================

export const ExecutorWorkspaceCreateSchema = z.object({
  executor_device_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  workspace_path: z.string().min(1),
  relative_path: z.string().min(1),
  metadata_path: z.string().optional(),
  workspace_name: z.string().min(1).max(200),
  repo_url: z.string().url().optional(),
  repo_branch: z.string().default('main'),
  project_type: z.enum(['swift', 'python', 'nodejs', 'go', 'rust', 'generic']).optional(),
  project_name: z.string().optional(),
  allowed_commands: z.array(z.string()).optional(),
  environment_vars: z.record(z.string()).optional(),
  system_prompt: z.string().optional(),
  execution_timeout_minutes: z.number().int().min(1).max(300).default(30),
  enable_network: z.boolean().default(true),
  enable_git: z.boolean().default(true),
  max_disk_usage_mb: z.number().int().min(100).max(50000).default(5000)
});

export const ExecutorWorkspaceUpdateSchema = z.object({
  workspace_name: z.string().min(1).max(200).optional(),
  status: z.enum([
    'creating', 'initializing', 'cloning', 'ready', 'assigned',
    'running', 'paused', 'completed', 'failed', 'archived', 'cleanup'
  ]).optional(),
  progress_percentage: z.number().int().min(0).max(100).optional(),
  current_phase: z.string().optional(),
  current_step: z.string().optional(),
  disk_usage_bytes: z.number().int().min(0).optional(),
  file_count: z.number().int().min(0).optional(),
  repo_url: z.string().url().optional().nullable(),
  repo_branch: z.string().optional(),
  project_type: z.enum(['swift', 'python', 'nodejs', 'go', 'rust', 'generic']).optional().nullable(),
  project_name: z.string().optional().nullable(),
  allowed_commands: z.array(z.string()).optional().nullable(),
  environment_vars: z.record(z.string()).optional().nullable(),
  system_prompt: z.string().optional().nullable(),
  execution_timeout_minutes: z.number().int().min(1).max(300).optional(),
  enable_network: z.boolean().optional(),
  enable_git: z.boolean().optional(),
  max_disk_usage_mb: z.number().int().min(100).max(50000).optional()
});

export const ExecutorWorkspaceQuerySchema = z.object({
  executor_device_id: z.string().uuid().optional(),
  agent_id: z.string().uuid().optional(),
  status: z.enum([
    'creating', 'initializing', 'cloning', 'ready', 'assigned',
    'running', 'paused', 'completed', 'failed', 'archived', 'cleanup'
  ]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

// =====================================================
// EXECUTOR WORKSPACE TASKS SCHEMAS
// =====================================================

export const ExecutorWorkspaceTaskCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  ai_task_id: z.string().uuid(),
  prompt_file_path: z.string().optional(),
  output_file_path: z.string().optional(),
  estimated_cost_usd: z.number().optional(),
  max_retries: z.number().int().min(0).max(10).default(3)
});

export const ExecutorWorkspaceTaskUpdateSchema = z.object({
  status: z.enum([
    'assigned', 'queued', 'starting', 'running', 'paused',
    'completed', 'failed', 'timeout', 'cancelled'
  ]).optional(),
  result_file_path: z.string().optional(),
  exit_code: z.number().int().optional(),
  output_summary: z.string().optional(),
  error_message: z.string().optional(),
  execution_duration_seconds: z.number().int().optional(),
  cpu_time_seconds: z.number().int().optional(),
  memory_peak_mb: z.number().int().optional(),
  actual_cost_usd: z.number().optional()
});

// =====================================================
// EXECUTOR WORKSPACE EVENTS SCHEMAS
// =====================================================

export const ExecutorWorkspaceEventCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  workspace_task_id: z.string().uuid().optional(),
  executor_device_id: z.string().uuid(),
  event_type: z.string().min(1),
  event_category: z.enum(['lifecycle', 'task', 'error', 'resource', 'system']).default('lifecycle'),
  message: z.string().min(1),
  details: z.record(z.any()).optional(),
  level: z.enum(['debug', 'info', 'warning', 'error', 'critical']).default('info'),
  source: z.string().optional()
});

// =====================================================
// EXECUTOR WORKSPACE ARTIFACTS SCHEMAS
// =====================================================

export const ExecutorWorkspaceArtifactCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  workspace_task_id: z.string().uuid().optional(),
  file_path: z.string().min(1),
  file_name: z.string().min(1),
  file_extension: z.string().optional(),
  artifact_type: z.enum([
    'source_code', 'config', 'documentation', 'test', 'build_output',
    'log', 'result', 'prompt', 'screenshot', 'data', 'other'
  ]),
  file_size_bytes: z.number().int().min(0).optional(),
  mime_type: z.string().optional(),
  checksum: z.string().optional(),
  storage_type: z.enum(['reference', 'inline', 'external']).default('reference'),
  content: z.string().optional(),
  content_preview: z.string().optional(),
  external_url: z.string().url().optional(),
  language: z.string().optional(),
  line_count: z.number().int().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  is_output: z.boolean().default(false),
  is_modified: z.boolean().default(false)
});

// =====================================================
// EXECUTOR WORKSPACE METRICS SCHEMAS
// =====================================================

export const ExecutorWorkspaceMetricCreateSchema = z.object({
  workspace_id: z.string().uuid(),
  workspace_task_id: z.string().uuid().optional(),
  executor_device_id: z.string().uuid(),
  cpu_usage_percent: z.number().min(0).max(100).optional(),
  memory_usage_mb: z.number().int().min(0).optional(),
  disk_usage_mb: z.number().int().min(0).optional(),
  disk_read_mb: z.number().int().min(0).optional(),
  disk_write_mb: z.number().int().min(0).optional(),
  network_in_mb: z.number().int().min(0).optional(),
  network_out_mb: z.number().int().min(0).optional(),
  process_count: z.number().int().min(0).optional(),
  thread_count: z.number().int().min(0).optional(),
  open_files_count: z.number().int().min(0).optional(),
  command_execution_count: z.number().int().min(0).optional(),
  command_success_count: z.number().int().min(0).optional(),
  command_failure_count: z.number().int().min(0).optional(),
  avg_command_duration_ms: z.number().int().min(0).optional(),
  cumulative_cost_usd: z.number().min(0).optional(),
  metric_type: z.enum(['snapshot', 'aggregated', 'peak', 'average']).default('snapshot'),
  aggregation_period_minutes: z.number().int().optional()
});

// Export all schemas
export const ExecutorSchemas = {
  Device: {
    Create: ExecutorDeviceCreateSchema,
    Update: ExecutorDeviceUpdateSchema,
    Query: ExecutorDeviceQuerySchema
  },
  Workspace: {
    Create: ExecutorWorkspaceCreateSchema,
    Update: ExecutorWorkspaceUpdateSchema,
    Query: ExecutorWorkspaceQuerySchema
  },
  WorkspaceTask: {
    Create: ExecutorWorkspaceTaskCreateSchema,
    Update: ExecutorWorkspaceTaskUpdateSchema
  },
  Event: {
    Create: ExecutorWorkspaceEventCreateSchema
  },
  Artifact: {
    Create: ExecutorWorkspaceArtifactCreateSchema
  },
  Metric: {
    Create: ExecutorWorkspaceMetricCreateSchema
  }
};
