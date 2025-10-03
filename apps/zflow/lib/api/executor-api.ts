import { API_BASE, authenticatedFetch } from './api-base'

// =====================================================
// TYPES
// =====================================================

export interface ExecutorDevice {
  id: string
  user_id: string
  device_name: string
  device_id: string
  platform: 'macos' | 'linux' | 'windows'
  os_version?: string
  executor_version?: string
  root_workspace_path: string
  max_concurrent_workspaces: number
  max_disk_usage_gb: number
  default_shell: string
  default_timeout_minutes: number
  allowed_commands?: string[]
  environment_vars?: Record<string, string>
  system_prompt?: string
  claude_code_path?: string
  features?: string[]
  status: 'active' | 'inactive' | 'maintenance' | 'disabled'
  is_online: boolean
  last_heartbeat_at?: string
  current_workspaces_count: number
  current_disk_usage_gb: number
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
  last_online_at?: string
}

export interface ExecutorWorkspace {
  id: string
  executor_device_id: string
  agent_id: string
  user_id: string
  workspace_path: string
  relative_path: string
  metadata_path?: string
  workspace_name: string
  repo_url?: string
  repo_branch: string
  project_type?: 'swift' | 'python' | 'nodejs' | 'go' | 'rust' | 'generic'
  project_name?: string
  allowed_commands?: string[]
  environment_vars?: Record<string, string>
  system_prompt?: string
  execution_timeout_minutes: number
  enable_network: boolean
  enable_git: boolean
  max_disk_usage_mb: number
  status: 'creating' | 'initializing' | 'cloning' | 'ready' | 'assigned' | 'running' | 'paused' | 'completed' | 'failed' | 'archived' | 'cleanup'
  progress_percentage: number
  current_phase?: string
  current_step?: string
  last_heartbeat_at?: string
  disk_usage_bytes: number
  file_count: number
  created_at: string
  initialized_at?: string
  ready_at?: string
  archived_at?: string
  updated_at: string
  // Joined data
  executor_device?: Pick<ExecutorDevice, 'device_name' | 'platform' | 'is_online'>
  agent?: { name: string }
  tasks?: ExecutorWorkspaceTask[]
}

export interface ExecutorWorkspaceTask {
  id: string
  workspace_id: string
  ai_task_id: string
  user_id: string
  assigned_at: string
  started_at?: string
  completed_at?: string
  status: 'assigned' | 'queued' | 'starting' | 'running' | 'paused' | 'completed' | 'failed' | 'timeout' | 'cancelled'
  prompt_file_path?: string
  output_file_path?: string
  result_file_path?: string
  exit_code?: number
  output_summary?: string
  error_message?: string
  execution_duration_seconds?: number
  cpu_time_seconds?: number
  memory_peak_mb?: number
  estimated_cost_usd?: number
  actual_cost_usd?: number
  retry_count: number
  max_retries: number
  created_at: string
  updated_at: string
}

export interface ExecutorWorkspaceEvent {
  id: string
  workspace_id: string
  workspace_task_id?: string
  executor_device_id: string
  user_id: string
  event_type: string
  event_category: 'lifecycle' | 'task' | 'error' | 'resource' | 'system'
  message: string
  details?: Record<string, any>
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical'
  source?: string
  created_at: string
}

export interface ExecutorWorkspaceArtifact {
  id: string
  workspace_id: string
  workspace_task_id?: string
  user_id: string
  file_path: string
  file_name: string
  file_extension?: string
  artifact_type: 'source_code' | 'config' | 'documentation' | 'test' | 'build_output' | 'log' | 'result' | 'prompt' | 'screenshot' | 'data' | 'other'
  file_size_bytes?: number
  mime_type?: string
  checksum?: string
  storage_type: 'reference' | 'inline' | 'external'
  content?: string
  content_preview?: string
  external_url?: string
  language?: string
  line_count?: number
  description?: string
  tags?: string[]
  is_output: boolean
  is_modified: boolean
  created_at: string
  modified_at?: string
  detected_at: string
}

export interface ExecutorWorkspaceMetric {
  id: string
  workspace_id: string
  workspace_task_id?: string
  executor_device_id: string
  user_id: string
  cpu_usage_percent?: number
  memory_usage_mb?: number
  disk_usage_mb?: number
  disk_read_mb?: number
  disk_write_mb?: number
  network_in_mb?: number
  network_out_mb?: number
  process_count?: number
  thread_count?: number
  open_files_count?: number
  command_execution_count?: number
  command_success_count?: number
  command_failure_count?: number
  avg_command_duration_ms?: number
  cumulative_cost_usd?: number
  metric_type: 'snapshot' | 'aggregated' | 'peak' | 'average'
  aggregation_period_minutes?: number
  recorded_at: string
}

// =====================================================
// DEVICE MANAGEMENT
// =====================================================

export async function fetchExecutorDevices(): Promise<ExecutorDevice[]> {
  const url = `${API_BASE}/executor/devices`
  console.log('[ExecutorAPI] Fetching devices from:', url)
  const response = await authenticatedFetch(url)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch devices: ${response.status}`)
  }
  const data = await response.json()
  console.log('[ExecutorAPI] Devices response:', data)
  return data.devices || []
}

export async function fetchExecutorDevice(deviceId: string): Promise<ExecutorDevice> {
  const response = await authenticatedFetch(`${API_BASE}/executor/devices/${deviceId}`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch device: ${response.status}`)
  }
  const data = await response.json()
  return data.device
}

// =====================================================
// WORKSPACE MANAGEMENT
// =====================================================

export async function fetchExecutorWorkspaces(filters?: {
  executor_device_id?: string
  agent_id?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<ExecutorWorkspace[]> {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value))
    })
  }

  const url = params.toString()
    ? `${API_BASE}/executor/workspaces?${params}`
    : `${API_BASE}/executor/workspaces`

  const response = await authenticatedFetch(url)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch workspaces: ${response.status}`)
  }
  const data = await response.json()
  return data.workspaces || []
}

export async function fetchExecutorWorkspace(workspaceId: string): Promise<ExecutorWorkspace> {
  const response = await authenticatedFetch(`${API_BASE}/executor/workspaces/${workspaceId}`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch workspace: ${response.status}`)
  }
  const data = await response.json()
  return data.workspace
}

// =====================================================
// TASK MANAGEMENT
// =====================================================

export async function fetchWorkspaceTasks(workspaceId: string): Promise<ExecutorWorkspaceTask[]> {
  const response = await authenticatedFetch(`${API_BASE}/executor/workspaces/${workspaceId}/tasks`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch tasks: ${response.status}`)
  }
  const data = await response.json()
  return data.tasks || []
}

export async function fetchWorkspaceTask(taskId: string): Promise<ExecutorWorkspaceTask> {
  const response = await authenticatedFetch(`${API_BASE}/executor/tasks/${taskId}`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch task: ${response.status}`)
  }
  const data = await response.json()
  return data.task
}

// =====================================================
// EVENTS
// =====================================================

export async function fetchWorkspaceEvents(
  workspaceId: string,
  filters?: { level?: string; event_category?: string; limit?: number }
): Promise<ExecutorWorkspaceEvent[]> {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value))
    })
  }

  const url = params.toString()
    ? `${API_BASE}/executor/workspaces/${workspaceId}/events?${params}`
    : `${API_BASE}/executor/workspaces/${workspaceId}/events`

  const response = await authenticatedFetch(url)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch events: ${response.status}`)
  }
  const data = await response.json()
  return data.events || []
}

// =====================================================
// ARTIFACTS
// =====================================================

export async function fetchWorkspaceArtifacts(
  workspaceId: string,
  filters?: { artifact_type?: string; is_output?: boolean }
): Promise<ExecutorWorkspaceArtifact[]> {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value))
    })
  }

  const url = params.toString()
    ? `${API_BASE}/executor/workspaces/${workspaceId}/artifacts?${params}`
    : `${API_BASE}/executor/workspaces/${workspaceId}/artifacts`

  const response = await authenticatedFetch(url)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch artifacts: ${response.status}`)
  }
  const data = await response.json()
  return data.artifacts || []
}

// =====================================================
// METRICS
// =====================================================

export async function fetchWorkspaceMetrics(
  workspaceId: string,
  filters?: { metric_type?: string }
): Promise<ExecutorWorkspaceMetric[]> {
  const params = new URLSearchParams()
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value))
    })
  }

  const url = params.toString()
    ? `${API_BASE}/executor/workspaces/${workspaceId}/metrics?${params}`
    : `${API_BASE}/executor/workspaces/${workspaceId}/metrics`

  const response = await authenticatedFetch(url)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch metrics: ${response.status}`)
  }
  const data = await response.json()
  return data.metrics || []
}

// =====================================================
// API OBJECT EXPORT
// =====================================================

export const executorApi = {
  // Devices
  fetchDevices: fetchExecutorDevices,
  fetchDevice: fetchExecutorDevice,

  // Workspaces
  fetchWorkspaces: fetchExecutorWorkspaces,
  fetchWorkspace: fetchExecutorWorkspace,

  // Tasks
  fetchWorkspaceTasks,
  fetchWorkspaceTask,

  // Events
  fetchWorkspaceEvents,

  // Artifacts
  fetchWorkspaceArtifacts,

  // Metrics
  fetchWorkspaceMetrics
}
