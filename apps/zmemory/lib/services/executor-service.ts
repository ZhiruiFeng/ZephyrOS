import { BaseServiceImpl } from './base-service';
import type { ServiceContext, ServiceDependencies, ServiceResult } from './types';
import {
  ExecutorDeviceRepository,
  ExecutorWorkspaceRepository,
  ExecutorWorkspaceTaskRepository,
  ExecutorEventRepository,
  ExecutorArtifactRepository,
  ExecutorMetricRepository,
  type ExecutorDevice,
  type ExecutorWorkspace,
  type ExecutorWorkspaceTask,
  type ExecutorEvent,
  type ExecutorArtifact,
  type ExecutorMetric
} from '../database/repositories/executor-repository';
import { getDatabaseClient } from '../database/client';

export class ExecutorService extends BaseServiceImpl {
  private deviceRepo: ExecutorDeviceRepository;
  private workspaceRepo: ExecutorWorkspaceRepository;
  private taskRepo: ExecutorWorkspaceTaskRepository;
  private eventRepo: ExecutorEventRepository;
  private artifactRepo: ExecutorArtifactRepository;
  private metricRepo: ExecutorMetricRepository;

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);

    const supabase = getDatabaseClient();
    this.deviceRepo = new ExecutorDeviceRepository(supabase);
    this.workspaceRepo = new ExecutorWorkspaceRepository(supabase);
    this.taskRepo = new ExecutorWorkspaceTaskRepository(supabase);
    this.eventRepo = new ExecutorEventRepository(supabase);
    this.artifactRepo = new ExecutorArtifactRepository(supabase);
    this.metricRepo = new ExecutorMetricRepository(supabase);
  }

  // =====================================================
  // DEVICE MANAGEMENT
  // =====================================================

  async registerDevice(data: Partial<ExecutorDevice>): Promise<ServiceResult<ExecutorDevice>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.deviceRepo.createDevice(this.context.userId!, data);
      if (result.error) throw result.error;

      this.logOperation('info', 'device_registered', {
        deviceId: result.data!.id,
        deviceName: result.data!.device_name
      });

      return result.data!;
    }, 'Failed to register device');
  }

  async getDevice(deviceId: string): Promise<ServiceResult<ExecutorDevice>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(deviceId, 'deviceId');

      const result = await this.deviceRepo.getDevice(this.context.userId!, deviceId);
      if (result.error) throw result.error;

      return result.data!;
    }, 'Failed to get device');
  }

  async listDevices(filters?: any): Promise<ServiceResult<ExecutorDevice[]>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.deviceRepo.listDevices(this.context.userId!, filters);
      if (result.error) throw result.error;

      return result.data || [];
    }, 'Failed to list devices');
  }

  async updateDevice(deviceId: string, data: Partial<ExecutorDevice>): Promise<ServiceResult<ExecutorDevice>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(deviceId, 'deviceId');

      const result = await this.deviceRepo.updateDevice(this.context.userId!, deviceId, data);
      if (result.error) throw result.error;

      this.logOperation('info', 'device_updated', { deviceId });

      return result.data!;
    }, 'Failed to update device');
  }

  async sendDeviceHeartbeat(deviceId: string): Promise<ServiceResult<void>> {
    return this.safeOperation(async () => {
      this.validateRequired(deviceId, 'deviceId');

      const result = await this.deviceRepo.updateDeviceHeartbeat(deviceId);
      if (result.error) throw result.error;

      return undefined;
    }, 'Failed to send device heartbeat');
  }

  async deleteDevice(deviceId: string): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(deviceId, 'deviceId');

      const result = await this.deviceRepo.deleteDevice(this.context.userId!, deviceId);
      if (result.error) throw result.error;

      this.logOperation('info', 'device_deleted', { deviceId });

      return result.data!;
    }, 'Failed to delete device');
  }

  // =====================================================
  // WORKSPACE MANAGEMENT
  // =====================================================

  async createWorkspace(data: Partial<ExecutorWorkspace>): Promise<ServiceResult<ExecutorWorkspace>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.workspaceRepo.createWorkspace(this.context.userId!, data);
      if (result.error) throw result.error;

      // Log workspace creation event
      await this.logEvent({
        workspace_id: result.data!.id,
        executor_device_id: data.executor_device_id!,
        event_type: 'workspace_created',
        event_category: 'lifecycle',
        message: `Workspace created at ${data.workspace_path}`,
        level: 'info',
        source: 'ExecutorService'
      });

      this.logOperation('info', 'workspace_created', {
        workspaceId: result.data!.id,
        deviceId: data.executor_device_id
      });

      return result.data!;
    }, 'Failed to create workspace');
  }

  async getWorkspace(workspaceId: string): Promise<ServiceResult<ExecutorWorkspace>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');

      const result = await this.workspaceRepo.getWorkspace(this.context.userId!, workspaceId);
      if (result.error) throw result.error;

      return result.data!;
    }, 'Failed to get workspace');
  }

  async listWorkspaces(filters?: any): Promise<ServiceResult<ExecutorWorkspace[]>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.workspaceRepo.listWorkspaces(this.context.userId!, filters);
      if (result.error) throw result.error;

      return result.data || [];
    }, 'Failed to list workspaces');
  }

  async updateWorkspace(workspaceId: string, data: Partial<ExecutorWorkspace>): Promise<ServiceResult<ExecutorWorkspace>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');

      const result = await this.workspaceRepo.updateWorkspace(this.context.userId!, workspaceId, data);
      if (result.error) throw result.error;

      this.logOperation('info', 'workspace_updated', { workspaceId, updates: data });

      return result.data!;
    }, 'Failed to update workspace');
  }

  async updateWorkspaceStatus(
    workspaceId: string,
    status: string,
    progress?: number
  ): Promise<ServiceResult<ExecutorWorkspace>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');

      const updateData: Partial<ExecutorWorkspace> = { status };
      if (progress !== undefined) {
        updateData.progress_percentage = progress;
      }

      const result = await this.workspaceRepo.updateWorkspace(this.context.userId!, workspaceId, updateData);
      if (result.error) throw result.error;

      // Log status change event
      await this.logEvent({
        workspace_id: workspaceId,
        executor_device_id: result.data!.executor_device_id,
        event_type: 'status_changed',
        event_category: 'lifecycle',
        message: `Workspace status changed to ${status}`,
        details: { status, progress },
        level: 'info',
        source: 'ExecutorService'
      });

      return result.data!;
    }, 'Failed to update workspace status');
  }

  async deleteWorkspace(workspaceId: string): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');

      const result = await this.workspaceRepo.deleteWorkspace(this.context.userId!, workspaceId);
      if (result.error) throw result.error;

      this.logOperation('info', 'workspace_deleted', { workspaceId });

      return result.data!;
    }, 'Failed to delete workspace');
  }

  // =====================================================
  // TASK MANAGEMENT
  // =====================================================

  async assignTask(
    workspaceId: string,
    aiTaskId: string,
    config: Partial<ExecutorWorkspaceTask>
  ): Promise<ServiceResult<ExecutorWorkspaceTask>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');
      this.validateRequired(aiTaskId, 'aiTaskId');

      const taskData: Partial<ExecutorWorkspaceTask> = {
        workspace_id: workspaceId,
        ai_task_id: aiTaskId,
        ...config
      };

      const result = await this.taskRepo.createWorkspaceTask(this.context.userId!, taskData);
      if (result.error) throw result.error;

      // Update workspace status to assigned
      await this.updateWorkspaceStatus(workspaceId, 'assigned');

      // Log task assignment event
      const workspace = await this.workspaceRepo.getWorkspace(this.context.userId!, workspaceId);
      if (workspace.data) {
        await this.logEvent({
          workspace_id: workspaceId,
          workspace_task_id: result.data!.id,
          executor_device_id: workspace.data.executor_device_id,
          event_type: 'task_assigned',
          event_category: 'task',
          message: `AI Task ${aiTaskId} assigned to workspace`,
          level: 'info',
          source: 'ExecutorService'
        });
      }

      this.logOperation('info', 'task_assigned', {
        workspaceId,
        aiTaskId,
        taskId: result.data!.id
      });

      return result.data!;
    }, 'Failed to assign task');
  }

  async getWorkspaceTask(taskId: string): Promise<ServiceResult<ExecutorWorkspaceTask>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');

      const result = await this.taskRepo.getWorkspaceTask(this.context.userId!, taskId);
      if (result.error) throw result.error;

      return result.data!;
    }, 'Failed to get workspace task');
  }

  async updateWorkspaceTask(
    taskId: string,
    data: Partial<ExecutorWorkspaceTask>
  ): Promise<ServiceResult<ExecutorWorkspaceTask>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');

      const result = await this.taskRepo.updateWorkspaceTask(this.context.userId!, taskId, data);
      if (result.error) throw result.error;

      this.logOperation('info', 'workspace_task_updated', { taskId, updates: data });

      return result.data!;
    }, 'Failed to update workspace task');
  }

  async listWorkspaceTasks(workspaceId: string): Promise<ServiceResult<ExecutorWorkspaceTask[]>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');

      const result = await this.taskRepo.listWorkspaceTasks(this.context.userId!, workspaceId);
      if (result.error) throw result.error;

      return result.data || [];
    }, 'Failed to list workspace tasks');
  }

  // =====================================================
  // EVENT LOGGING
  // =====================================================

  async logEvent(eventData: Partial<ExecutorEvent>): Promise<ServiceResult<void>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.eventRepo.createEvent(this.context.userId!, eventData);
      if (result.error) throw result.error;

      return undefined;
    }, 'Failed to log event');
  }

  async listEvents(workspaceId: string, filters?: any): Promise<ServiceResult<ExecutorEvent[]>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');

      const result = await this.eventRepo.listEvents(this.context.userId!, workspaceId, filters);
      if (result.error) throw result.error;

      return result.data || [];
    }, 'Failed to list events');
  }

  // =====================================================
  // ARTIFACT MANAGEMENT
  // =====================================================

  async uploadArtifact(artifactData: Partial<ExecutorArtifact>): Promise<ServiceResult<ExecutorArtifact>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.artifactRepo.createArtifact(this.context.userId!, artifactData);
      if (result.error) throw result.error;

      this.logOperation('info', 'artifact_uploaded', {
        artifactId: result.data!.id,
        workspaceId: artifactData.workspace_id,
        fileName: artifactData.file_name
      });

      return result.data!;
    }, 'Failed to upload artifact');
  }

  async getArtifact(artifactId: string): Promise<ServiceResult<ExecutorArtifact>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(artifactId, 'artifactId');

      const result = await this.artifactRepo.getArtifact(this.context.userId!, artifactId);
      if (result.error) throw result.error;

      return result.data!;
    }, 'Failed to get artifact');
  }

  async listArtifacts(workspaceId: string, filters?: any): Promise<ServiceResult<ExecutorArtifact[]>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');

      const result = await this.artifactRepo.listArtifacts(this.context.userId!, workspaceId, filters);
      if (result.error) throw result.error;

      return result.data || [];
    }, 'Failed to list artifacts');
  }

  // =====================================================
  // METRICS
  // =====================================================

  async recordMetrics(metricData: Partial<ExecutorMetric>): Promise<ServiceResult<void>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.metricRepo.createMetric(this.context.userId!, metricData);
      if (result.error) throw result.error;

      return undefined;
    }, 'Failed to record metrics');
  }

  async listMetrics(workspaceId: string, filters?: any): Promise<ServiceResult<ExecutorMetric[]>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');

      const result = await this.metricRepo.listMetrics(this.context.userId!, workspaceId, filters);
      if (result.error) throw result.error;

      return result.data || [];
    }, 'Failed to list metrics');
  }

  async getResourceSummary(workspaceId: string): Promise<ServiceResult<any>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(workspaceId, 'workspaceId');

      const result = await this.metricRepo.getResourceSummary(workspaceId);
      if (result.error) throw result.error;

      return result.data;
    }, 'Failed to get resource summary');
  }
}

// Factory function
export function createExecutorService(context: ServiceContext, dependencies?: ServiceDependencies): ExecutorService {
  // If no dependencies provided, create default ones
  if (!dependencies) {
    const { repositories } = require('@/database');
    dependencies = {
      memoryRepository: repositories.getMemoryRepository(),
      taskRepository: repositories.getTaskRepository(),
      activityRepository: repositories.getActivityRepository(),
      aiTaskRepository: repositories.getAITaskRepository(),
      corePrincipleRepository: repositories.getCorePrincipleRepository(),
      dailyStrategyRepository: repositories.getDailyStrategyRepository()
    };
  }

  return new ExecutorService(context, dependencies);
}
