import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  RepositoryResult,
  RepositoryListResult,
  FilterParams
} from '../types';

// =====================================================
// EXECUTOR DEVICE REPOSITORY
// =====================================================

export interface ExecutorDevice {
  id: string;
  user_id: string;
  device_name: string;
  device_id: string;
  platform: string;
  os_version?: string;
  executor_version?: string;
  root_workspace_path: string;
  max_concurrent_workspaces: number;
  max_disk_usage_gb: number;
  default_shell: string;
  default_timeout_minutes: number;
  allowed_commands?: string[];
  environment_vars?: Record<string, string>;
  system_prompt?: string;
  claude_code_path?: string;
  features?: string[];
  status: string;
  is_online: boolean;
  last_heartbeat_at?: string;
  current_workspaces_count: number;
  current_disk_usage_gb: number;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  last_online_at?: string;
}

export class ExecutorDeviceRepository extends BaseRepository<ExecutorDevice> {
  constructor(client: DatabaseClient) {
    super(client, 'executor_devices');
  }

  async createDevice(userId: string, data: Partial<ExecutorDevice>): Promise<RepositoryResult<ExecutorDevice>> {
    return this.create(userId, data);
  }

  async getDevice(userId: string, deviceId: string): Promise<RepositoryResult<ExecutorDevice>> {
    return this.findByUserAndId(userId, deviceId);
  }

  async listDevices(userId: string, filters?: FilterParams): Promise<RepositoryListResult<ExecutorDevice>> {
    return this.findByUser(userId, filters || {});
  }

  async updateDevice(userId: string, deviceId: string, data: Partial<ExecutorDevice>): Promise<RepositoryResult<ExecutorDevice>> {
    return this.updateByUserAndId(userId, deviceId, data);
  }

  async updateDeviceHeartbeat(deviceId: string): Promise<RepositoryResult<void>> {
    try {
      const { error } = await this.client.rpc('update_executor_device_heartbeat', {
        device_uuid: deviceId
      });

      if (error) {
        console.error('Error updating device heartbeat:', error);
        return { data: null, error: new Error('Failed to update device heartbeat') };
      }

      return { data: undefined, error: null };
    } catch (error) {
      console.error('Unexpected error updating device heartbeat:', error);
      return { data: null, error: new Error('Failed to update device heartbeat') };
    }
  }

  async deleteDevice(userId: string, deviceId: string): Promise<RepositoryResult<boolean>> {
    return this.deleteByUserAndId(userId, deviceId);
  }

  protected applyFilters(query: any, filters: FilterParams): any {
    query = super.applyFilters(query, filters);

    if (filters.is_online !== undefined) {
      query = query.eq('is_online', filters.is_online);
    }

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    return query;
  }
}

// =====================================================
// EXECUTOR WORKSPACE REPOSITORY
// =====================================================

export interface ExecutorWorkspace {
  id: string;
  executor_device_id: string;
  agent_id: string;
  user_id: string;
  workspace_path: string;
  relative_path: string;
  metadata_path?: string;
  repo_url?: string;
  repo_branch: string;
  project_type?: string;
  project_name?: string;
  allowed_commands?: string[];
  environment_vars?: Record<string, string>;
  system_prompt?: string;
  execution_timeout_minutes: number;
  enable_network: boolean;
  enable_git: boolean;
  max_disk_usage_mb: number;
  status: string;
  progress_percentage: number;
  current_phase?: string;
  current_step?: string;
  last_heartbeat_at?: string;
  disk_usage_bytes: number;
  file_count: number;
  created_at: string;
  initialized_at?: string;
  ready_at?: string;
  archived_at?: string;
  updated_at: string;
}

export class ExecutorWorkspaceRepository extends BaseRepository<ExecutorWorkspace> {
  constructor(client: DatabaseClient) {
    super(client, 'executor_agent_workspaces');
  }

  async createWorkspace(userId: string, data: Partial<ExecutorWorkspace>): Promise<RepositoryResult<ExecutorWorkspace>> {
    return this.create(userId, data);
  }

  async getWorkspace(userId: string, workspaceId: string): Promise<RepositoryResult<ExecutorWorkspace>> {
    const select = `
      *,
      executor_device:executor_devices(*),
      agent:ai_agents(*),
      tasks:executor_workspace_tasks(*)
    `;
    return this.findByUserAndId(userId, workspaceId, select);
  }

  async listWorkspaces(userId: string, filters?: FilterParams): Promise<RepositoryListResult<ExecutorWorkspace>> {
    const select = `
      *,
      executor_device:executor_devices(device_name, platform, is_online),
      agent:ai_agents(name),
      tasks:executor_workspace_tasks(ai_task_id, status)
    `;

    return this.findByUser(userId, filters || {}, select);
  }

  async updateWorkspace(userId: string, workspaceId: string, data: Partial<ExecutorWorkspace>): Promise<RepositoryResult<ExecutorWorkspace>> {
    return this.updateByUserAndId(userId, workspaceId, data);
  }

  async deleteWorkspace(userId: string, workspaceId: string): Promise<RepositoryResult<boolean>> {
    return this.deleteByUserAndId(userId, workspaceId);
  }

  protected applyFilters(query: any, filters: FilterParams): any {
    query = super.applyFilters(query, filters);

    if (filters.executor_device_id) {
      query = query.eq('executor_device_id', filters.executor_device_id);
    }

    if (filters.agent_id) {
      query = query.eq('agent_id', filters.agent_id);
    }

    return query;
  }
}

// =====================================================
// EXECUTOR WORKSPACE TASK REPOSITORY
// =====================================================

export interface ExecutorWorkspaceTask {
  id: string;
  workspace_id: string;
  ai_task_id: string;
  user_id: string;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  status: string;
  prompt_file_path?: string;
  output_file_path?: string;
  result_file_path?: string;
  exit_code?: number;
  output_summary?: string;
  error_message?: string;
  execution_duration_seconds?: number;
  cpu_time_seconds?: number;
  memory_peak_mb?: number;
  estimated_cost_usd?: number;
  actual_cost_usd?: number;
  retry_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export class ExecutorWorkspaceTaskRepository extends BaseRepository<ExecutorWorkspaceTask> {
  constructor(client: DatabaseClient) {
    super(client, 'executor_workspace_tasks');
  }

  async createWorkspaceTask(userId: string, data: Partial<ExecutorWorkspaceTask>): Promise<RepositoryResult<ExecutorWorkspaceTask>> {
    return this.create(userId, data);
  }

  async getWorkspaceTask(userId: string, taskId: string): Promise<RepositoryResult<ExecutorWorkspaceTask>> {
    return this.findByUserAndId(userId, taskId);
  }

  async updateWorkspaceTask(userId: string, taskId: string, data: Partial<ExecutorWorkspaceTask>): Promise<RepositoryResult<ExecutorWorkspaceTask>> {
    return this.updateByUserAndId(userId, taskId, data);
  }

  async listWorkspaceTasks(userId: string, workspaceId: string): Promise<RepositoryListResult<ExecutorWorkspaceTask>> {
    return this.findByUser(userId, { workspace_id: workspaceId } as FilterParams);
  }

  protected applyFilters(query: any, filters: FilterParams & { workspace_id?: string }): any {
    query = super.applyFilters(query, filters);

    if (filters.workspace_id) {
      query = query.eq('workspace_id', filters.workspace_id);
    }

    return query;
  }
}

// =====================================================
// EXECUTOR EVENT REPOSITORY
// =====================================================

export interface ExecutorEvent {
  id: string;
  workspace_id: string;
  workspace_task_id?: string;
  executor_device_id: string;
  user_id: string;
  event_type: string;
  event_category: string;
  message: string;
  details?: Record<string, any>;
  level: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

export class ExecutorEventRepository extends BaseRepository<ExecutorEvent> {
  constructor(client: DatabaseClient) {
    super(client, 'executor_workspace_events');
  }

  async createEvent(userId: string, data: Partial<ExecutorEvent>): Promise<RepositoryResult<ExecutorEvent>> {
    return this.create(userId, data);
  }

  async listEvents(userId: string, workspaceId: string, filters?: FilterParams): Promise<RepositoryListResult<ExecutorEvent>> {
    const combinedFilters = {
      ...filters,
      workspace_id: workspaceId
    } as FilterParams;

    return this.findByUser(userId, combinedFilters);
  }

  protected applyFilters(query: any, filters: FilterParams & { workspace_id?: string; level?: string; event_category?: string }): any {
    query = super.applyFilters(query, filters);

    if (filters.workspace_id) {
      query = query.eq('workspace_id', filters.workspace_id);
    }

    if (filters.level) {
      query = query.eq('level', filters.level);
    }

    if (filters.event_category) {
      query = query.eq('event_category', filters.event_category);
    }

    return query;
  }
}

// =====================================================
// EXECUTOR ARTIFACT REPOSITORY
// =====================================================

export interface ExecutorArtifact {
  id: string;
  workspace_id: string;
  workspace_task_id?: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_extension?: string;
  artifact_type: string;
  file_size_bytes?: number;
  mime_type?: string;
  checksum?: string;
  storage_type: string;
  content?: string;
  content_preview?: string;
  external_url?: string;
  language?: string;
  line_count?: number;
  description?: string;
  tags?: string[];
  is_output: boolean;
  is_modified: boolean;
  created_at: string;
  updated_at: string;
  modified_at?: string;
  detected_at: string;
}

export class ExecutorArtifactRepository extends BaseRepository<ExecutorArtifact> {
  constructor(client: DatabaseClient) {
    super(client, 'executor_workspace_artifacts');
  }

  async createArtifact(userId: string, data: Partial<ExecutorArtifact>): Promise<RepositoryResult<ExecutorArtifact>> {
    return this.create(userId, data);
  }

  async getArtifact(userId: string, artifactId: string): Promise<RepositoryResult<ExecutorArtifact>> {
    return this.findByUserAndId(userId, artifactId);
  }

  async listArtifacts(userId: string, workspaceId: string, filters?: FilterParams): Promise<RepositoryListResult<ExecutorArtifact>> {
    const combinedFilters = {
      ...filters,
      workspace_id: workspaceId
    } as FilterParams;

    return this.findByUser(userId, combinedFilters);
  }

  protected applyFilters(query: any, filters: FilterParams & { workspace_id?: string; artifact_type?: string; is_output?: boolean }): any {
    query = super.applyFilters(query, filters);

    if (filters.workspace_id) {
      query = query.eq('workspace_id', filters.workspace_id);
    }

    if (filters.artifact_type) {
      query = query.eq('artifact_type', filters.artifact_type);
    }

    if (filters.is_output !== undefined) {
      query = query.eq('is_output', filters.is_output);
    }

    return query;
  }
}

// =====================================================
// EXECUTOR METRIC REPOSITORY
// =====================================================

export interface ExecutorMetric {
  id: string;
  workspace_id: string;
  workspace_task_id?: string;
  executor_device_id: string;
  user_id: string;
  cpu_usage_percent?: number;
  memory_usage_mb?: number;
  disk_usage_mb?: number;
  disk_read_mb?: number;
  disk_write_mb?: number;
  network_in_mb?: number;
  network_out_mb?: number;
  process_count?: number;
  thread_count?: number;
  open_files_count?: number;
  command_execution_count?: number;
  command_success_count?: number;
  command_failure_count?: number;
  avg_command_duration_ms?: number;
  cumulative_cost_usd?: number;
  metric_type: string;
  aggregation_period_minutes?: number;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export class ExecutorMetricRepository extends BaseRepository<ExecutorMetric> {
  constructor(client: DatabaseClient) {
    super(client, 'executor_workspace_metrics');
  }

  async createMetric(userId: string, data: Partial<ExecutorMetric>): Promise<RepositoryResult<ExecutorMetric>> {
    return this.create(userId, data);
  }

  async listMetrics(userId: string, workspaceId: string, filters?: FilterParams): Promise<RepositoryListResult<ExecutorMetric>> {
    const combinedFilters = {
      ...filters,
      workspace_id: workspaceId
    } as FilterParams;

    return this.findByUser(userId, combinedFilters);
  }

  async getResourceSummary(workspaceId: string): Promise<RepositoryResult<any>> {
    try {
      const { data, error } = await this.client.rpc('get_workspace_resource_summary', {
        workspace_uuid: workspaceId
      });

      if (error) {
        console.error('Error getting workspace resource summary:', error);
        return { data: null, error: new Error('Failed to get workspace resource summary') };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error getting workspace resource summary:', error);
      return { data: null, error: new Error('Failed to get workspace resource summary') };
    }
  }

  protected applyFilters(query: any, filters: FilterParams & { workspace_id?: string; metric_type?: string }): any {
    query = super.applyFilters(query, filters);

    if (filters.workspace_id) {
      query = query.eq('workspace_id', filters.workspace_id);
    }

    if (filters.metric_type) {
      query = query.eq('metric_type', filters.metric_type);
    }

    return query;
  }
}
