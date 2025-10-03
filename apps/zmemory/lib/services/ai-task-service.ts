import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult,
  ServiceListResult,
  AITaskCreateRequest,
  AITaskExecutionResult,
  AITaskExecutionContext,
  AITaskBatchRequest,
  AITaskBatchResult
} from './types';
import type { AITask, AITaskFilterParams } from '@/database';
import { BusinessRuleError, ValidationError, NotFoundError } from './types';

export interface AITaskService {
  // Core CRUD operations
  findAITasks(filters: AITaskFilterParams): Promise<ServiceListResult<AITask>>;
  findAITaskById(taskId: string): Promise<ServiceResult<AITask>>;
  createAITask(request: AITaskCreateRequest): Promise<ServiceResult<AITask>>;
  updateAITask(taskId: string, updates: Partial<AITask>): Promise<ServiceResult<AITask>>;
  deleteAITask(taskId: string): Promise<ServiceResult<boolean>>;

  // Status and workflow management
  updateTaskStatus(taskId: string, status: AITask['status'], result?: AITaskExecutionResult): Promise<ServiceResult<AITask>>;
  scheduleTask(taskId: string, scheduledFor: string): Promise<ServiceResult<AITask>>;
  retryFailedTask(taskId: string): Promise<ServiceResult<AITask>>;
  cancelTask(taskId: string, reason?: string): Promise<ServiceResult<AITask>>;

  // Batch operations
  createBatchTasks(request: AITaskBatchRequest): Promise<ServiceResult<AITaskBatchResult>>;
  executeBatch(taskIds: string[], context?: AITaskExecutionContext): Promise<ServiceResult<AITaskBatchResult>>;

  // Query and analytics
  getTasksByAgent(agentId: string): Promise<ServiceListResult<AITask>>;
  getTasksByParent(parentTaskId: string): Promise<ServiceListResult<AITask>>;
  getTaskStatistics(): Promise<ServiceResult<any>>;
  getCostAnalysis(filters?: AITaskFilterParams): Promise<ServiceResult<any>>;

  // Business logic
  validateTaskExecution(task: AITask, context?: AITaskExecutionContext): Promise<ServiceResult<boolean>>;
  estimateTaskCost(request: AITaskCreateRequest): Promise<ServiceResult<number>>;
}

export class AITaskServiceImpl extends BaseServiceImpl implements AITaskService {

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Find AI tasks with advanced filtering
   */
  async findAITasks(filters: AITaskFilterParams): Promise<ServiceListResult<AITask>> {
    try {
      this.validateUserAccess();

      const result = await this.dependencies.aiTaskRepository.findAITasksAdvanced(
        this.context.userId,
        filters
      );

      if (result.error) {
        return { data: null, error: result.error, total: 0 };
      }

      this.logOperation('info', 'findAITasks', {
        filters,
        count: result.data?.length || 0,
        total: result.total
      });

      const enriched = (result.data || []).map(task => this.enrichTask(task));

      return {
        data: enriched,
        error: null,
        total: result.total || 0
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        total: 0
      };
    }
  }

  /**
   * Find AI task by ID
   */
  async findAITaskById(taskId: string): Promise<ServiceResult<AITask>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');

      const result = await this.dependencies.aiTaskRepository.findByUserAndId(
        this.context.userId,
        taskId
      );

      if (result.error) throw result.error;
      if (!result.data) throw new NotFoundError('AI Task', taskId);

      return this.enrichTask(result.data);
    });
  }

  /**
   * Create new AI task with validation
   */
  async createAITask(request: AITaskCreateRequest): Promise<ServiceResult<AITask>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(request.task_id, 'task_id');
      this.validateRequired(request.agent_id, 'agent_id');

      const objective = (request.objective || request.title || '').trim();
      this.validateRequired(objective, 'objective');
      this.validateRequired(request.task_type, 'task_type');

      // Validate business rules
      await this.validateTaskCreateRequest(request);

      // Estimate cost if not provided
      if (!request.estimated_cost && request.model) {
        const costEstimate = await this.estimateTaskCost(request);
        if (costEstimate.data) {
          request.estimated_cost = costEstimate.data;
        }
      }

      const normalizedPriority = (request.priority || request.metadata?.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent';
      const normalizedStatus = (request.status || 'pending') as 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
      const normalizedMode = (request.mode || 'plan_only') as 'plan_only' | 'dry_run' | 'execute';

      const baseMetadata = request.metadata ? { ...request.metadata } : {};
      const metadataTagsCandidate = request.tags ?? (Array.isArray(baseMetadata.tags) ? baseMetadata.tags : []);

      const metadata: Record<string, any> = {
        ...baseMetadata,
        priority: normalizedPriority,
        tags: Array.isArray(metadataTagsCandidate) ? metadataTagsCandidate : []
      };

      if (request.model) metadata.model = request.model;
      if (request.provider) metadata.provider = request.provider;
      if (request.prompt) metadata.prompt = request.prompt;
      if (request.system_prompt) metadata.system_prompt = request.system_prompt;
      if (request.retry_count !== undefined) metadata.retry_count = request.retry_count;
      if (request.max_retries !== undefined) metadata.max_retries = request.max_retries;
      if (request.category) metadata.category = request.category.trim();

      if (!Array.isArray(metadata.tags)) {
        metadata.tags = [];
      }

      metadata.tags = (metadata.tags as string[])
        .map((tag: string) => String(tag).trim())
        .filter((tag: string) => tag.length > 0);
      if (metadata.model !== undefined && metadata.model !== null) {
        metadata.model = String(metadata.model).trim();
      }
      if (metadata.provider !== undefined && metadata.provider !== null) {
        metadata.provider = String(metadata.provider).trim();
      }
      if (metadata.prompt !== undefined && metadata.prompt !== null) {
        metadata.prompt = String(metadata.prompt);
      }
      if (metadata.system_prompt !== undefined && metadata.system_prompt !== null) {
        metadata.system_prompt = String(metadata.system_prompt);
      }

      if (metadata.retry_count === undefined) {
        metadata.retry_count = 0;
      }

      if (metadata.max_retries === undefined) {
        metadata.max_retries = 3;
      }

      const defaultGuardrails = {
        costCapUSD: null,
        timeCapMin: null,
        requiresHumanApproval: true,
        dataScopes: [] as string[]
      };

      const guardrails = {
        ...defaultGuardrails,
        ...(request.guardrails || {})
      };

      if (!Array.isArray(guardrails.dataScopes)) {
        guardrails.dataScopes = [];
      }

      const dependencies = (request.dependencies || [])
        .map((dep: string) => dep.trim())
        .filter((dep: string) => dep.length > 0);

      const createPayload: Partial<AITask> = {
        task_id: request.task_id,
        agent_id: request.agent_id,
        objective,
        deliverables: request.deliverables ?? request.description ?? null,
        context: request.context ?? request.description ?? null,
        acceptance_criteria: request.acceptance_criteria ?? null,
        task_type: request.task_type as 'generation' | 'analysis' | 'summarization' | 'classification' | 'translation' | 'conversation' | 'coding' | 'reasoning' | 'other',
        dependencies,
        mode: normalizedMode,
        guardrails,
        metadata,
        status: normalizedStatus,
        estimated_cost_usd: request.estimated_cost ?? request.estimated_cost_usd ?? null,
        estimated_duration_min: request.estimated_duration_min ?? (
          request.estimated_duration_seconds !== undefined
            ? Math.round(request.estimated_duration_seconds / 60)
            : null
        ),
        due_at: request.deadline ?? request.due_at ?? null
      };

      // Remove undefined values so Supabase only sees valid columns
      Object.keys(createPayload).forEach((key) => {
        if ((createPayload as any)[key] === undefined) {
          delete (createPayload as any)[key];
        }
      });

      const result = await this.dependencies.aiTaskRepository.createAITask(
        this.context.userId,
        createPayload
      );

      if (result.error) throw result.error;

      this.logOperation('info', 'createAITask', {
        taskId: result.data!.id,
        taskType: request.task_type,
        model: request.model,
        estimatedCost: createPayload.estimated_cost_usd
      });

      return this.enrichTask(result.data!);
    });
  }

  /**
   * Update AI task
   */
  async updateAITask(taskId: string, updates: Partial<AITask>): Promise<ServiceResult<AITask>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');

      // Get current task
      const currentTask = await this.findAITaskById(taskId);
      if (currentTask.error) throw currentTask.error;

      // Validate updates
      if (updates.status) {
        await this.validateStatusTransition(currentTask.data!.status, updates.status);
      }

      const updatePayload = this.buildTaskUpdatePayload(updates, currentTask.data!);

      const result = await this.dependencies.aiTaskRepository.updateAITask(
        this.context.userId,
        taskId,
        updatePayload
      );

      if (result.error) throw result.error;

      this.logOperation('info', 'updateAITask', {
        taskId,
        updates: Object.keys(updates)
      });

      return this.enrichTask(result.data!);
    });
  }

  private buildTaskUpdatePayload(updates: Partial<AITask>, currentTask: AITask): Partial<AITask> {
    const payload: Partial<AITask> = {};

    if (updates.objective !== undefined) payload.objective = updates.objective ?? currentTask.objective;
    if (updates.deliverables !== undefined) payload.deliverables = updates.deliverables ?? null;
    if (updates.context !== undefined) payload.context = updates.context ?? null;
    if (updates.acceptance_criteria !== undefined) payload.acceptance_criteria = updates.acceptance_criteria ?? null;
    if (updates.task_type !== undefined) payload.task_type = updates.task_type;
    if (updates.mode !== undefined) payload.mode = updates.mode as 'plan_only' | 'dry_run' | 'execute';
    if (updates.status !== undefined) payload.status = updates.status as AITask['status'];
    if (updates.due_at !== undefined) payload.due_at = updates.due_at;
    if ((updates as any).deadline !== undefined) payload.due_at = (updates as any).deadline;

    if (updates.dependencies !== undefined) {
      payload.dependencies = updates.dependencies
        .map((dep: string) => dep.trim())
        .filter((dep: string) => dep.length > 0);
    }

    if (updates.guardrails !== undefined) {
      const defaultGuardrails = {
        costCapUSD: null,
        timeCapMin: null,
        requiresHumanApproval: true,
        dataScopes: [] as string[]
      };

      payload.guardrails = {
        ...defaultGuardrails,
        ...currentTask.guardrails,
        ...updates.guardrails
      };

      if (!Array.isArray(payload.guardrails.dataScopes)) {
        payload.guardrails.dataScopes = [];
      }

      payload.guardrails.dataScopes = payload.guardrails.dataScopes
        .map((scope: string) => String(scope).trim())
        .filter((scope: string) => scope.length > 0);
    }

    const metadata = { ...currentTask.metadata };
    let metadataChanged = false;

    if (updates.metadata) {
      Object.assign(metadata, updates.metadata);
      metadataChanged = true;
    }

    if (updates.priority !== undefined) {
      metadata.priority = updates.priority;
      metadataChanged = true;
    }

    if (updates.tags !== undefined) {
      metadata.tags = updates.tags;
      metadataChanged = true;
    }

    if ((updates as any).metadata?.tags !== undefined && !Array.isArray(metadata.tags)) {
      metadata.tags = Array.isArray((updates as any).metadata.tags) ? (updates as any).metadata.tags : [];
    }

    if (metadataChanged) {
      if (!Array.isArray(metadata.tags)) {
        metadata.tags = Array.isArray(currentTask.metadata?.tags) ? currentTask.metadata.tags : [];
      }
      metadata.tags = metadata.tags
        .map((tag: string) => String(tag).trim())
        .filter((tag: string) => tag.length > 0);
      if (metadata.category !== undefined && metadata.category !== null) {
        metadata.category = String(metadata.category).trim();
      }
      if (metadata.model !== undefined && metadata.model !== null) {
        metadata.model = String(metadata.model).trim();
      }
      if (metadata.provider !== undefined && metadata.provider !== null) {
        metadata.provider = String(metadata.provider).trim();
      }
      payload.metadata = metadata;
    }

    if ((updates as any).estimated_cost !== undefined) {
      payload.estimated_cost_usd = (updates as any).estimated_cost;
    }

    if (updates.estimated_cost_usd !== undefined) {
      payload.estimated_cost_usd = updates.estimated_cost_usd;
    }

    if ((updates as any).actual_cost !== undefined) {
      payload.actual_cost_usd = (updates as any).actual_cost;
    }

    if (updates.actual_cost_usd !== undefined) {
      payload.actual_cost_usd = updates.actual_cost_usd;
    }

    if ((updates as any).estimated_duration_seconds !== undefined) {
      payload.estimated_duration_min = Math.round(((updates as any).estimated_duration_seconds) / 60);
    }

    if (updates.estimated_duration_min !== undefined) {
      payload.estimated_duration_min = updates.estimated_duration_min;
    }

    if (updates.execution_result !== undefined) {
      payload.execution_result = updates.execution_result;
    }

    if (updates.history !== undefined) {
      payload.history = updates.history;
    }

    // Executor workspace fields
    if (updates.is_local_task !== undefined) {
      payload.is_local_task = updates.is_local_task;
    }

    if (updates.executor_workspace_id !== undefined) {
      payload.executor_workspace_id = updates.executor_workspace_id;
    }

    Object.keys(payload).forEach((key) => {
      if ((payload as any)[key] === undefined) {
        delete (payload as any)[key];
      }
    });

    return payload;
  }

  /**
   * Delete AI task
   */
  async deleteAITask(taskId: string): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');

      // Check if task can be deleted
      const task = await this.findAITaskById(taskId);
      if (task.error) throw task.error;

      if (task.data!.status === 'in_progress') {
        throw new BusinessRuleError('Cannot delete task that is currently executing');
      }

      const result = await this.dependencies.aiTaskRepository.deleteAITask(
        this.context.userId,
        taskId
      );

      if (result.error) throw result.error;

      this.logOperation('info', 'deleteAITask', { taskId });

      return true;
    });
  }

  /**
   * Update task status with execution results
   */
  async updateTaskStatus(
    taskId: string,
    status: AITask['status'],
    result?: AITaskExecutionResult
  ): Promise<ServiceResult<AITask>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');

      // Get current task
      const currentTask = await this.findAITaskById(taskId);
      if (currentTask.error) throw currentTask.error;

      // Validate status transition
      await this.validateStatusTransition(currentTask.data!.status, status);

      // Prepare result data for repository
      const resultData = result ? {
        output_data: result.output_data,
        error_message: result.error_message,
        tokens_used: result.tokens_used,
        actual_cost: result.actual_cost,
        execution_time_seconds: result.execution_time_seconds,
        model_used: result.model_used,
        provider_used: result.provider_used
      } : undefined;

      const updateResult = await this.dependencies.aiTaskRepository.updateTaskStatus(
        this.context.userId,
        taskId,
        status,
        resultData
      );

      if (updateResult.error) throw updateResult.error;

      this.logOperation('info', 'updateTaskStatus', {
        taskId,
        oldStatus: currentTask.data!.status,
        newStatus: status,
        hasResult: !!result
      });

      return this.enrichTask(updateResult.data!);
    });
  }

  /**
   * Schedule task for future execution
   */
  async scheduleTask(taskId: string, scheduledFor: string): Promise<ServiceResult<AITask>> {
    return this.updateAITask(taskId, { due_at: scheduledFor });
  }

  /**
   * Retry a failed task
   */
  async retryFailedTask(taskId: string): Promise<ServiceResult<AITask>> {
    return this.safeOperation(async () => {
      const task = await this.findAITaskById(taskId);
      if (task.error) throw task.error;

      if (task.data!.status !== 'failed') {
        throw new BusinessRuleError('Can only retry failed tasks');
      }

      const metadata = task.data!.metadata || {};
      const retryCount = Number(metadata.retry_count ?? 0);
      const maxRetries = Number(metadata.max_retries ?? 3);

      if (retryCount >= maxRetries) {
        throw new BusinessRuleError('Maximum retry attempts reached');
      }

      const updatedMetadata = { ...metadata, retry_count: retryCount };

      const updateResult = await this.updateAITask(taskId, {
        status: 'pending',
        metadata: updatedMetadata,
        execution_result: undefined
      });

      if (updateResult.error) throw updateResult.error;
      return this.enrichTask(updateResult.data!);
    });
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, reason?: string): Promise<ServiceResult<AITask>> {
    return this.safeOperation(async () => {
      const task = await this.findAITaskById(taskId);
      if (task.error) throw task.error;

      if (task.data!.status === 'completed') {
        throw new BusinessRuleError('Cannot cancel completed task');
      }

      const updates: Partial<AITask> = { status: 'cancelled' };
      if (reason) {
        updates.metadata = {
          ...task.data!.metadata,
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString()
        };
      }

      const updateResult = await this.updateAITask(taskId, updates);
      if (updateResult.error) throw updateResult.error;
      return this.enrichTask(updateResult.data!);
    });
  }

  /**
   * Create batch of AI tasks
   */
  async createBatchTasks(request: AITaskBatchRequest): Promise<ServiceResult<AITaskBatchResult>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateArrayLength(request.tasks, 'tasks', 1, 100);

      const results: AITaskExecutionResult[] = [];
      const errors: Array<{ task_index: number; error: string }> = [];
      let successfulTasks = 0;
      let totalCost = 0;

      for (let i = 0; i < request.tasks.length; i++) {
        try {
          const taskResult = await this.createAITask(request.tasks[i]);
          if (taskResult.data) {
            successfulTasks++;
            totalCost += taskResult.data.estimated_cost_usd || 0;
            results.push({
              task_id: taskResult.data.id,
              success: true
            });
          }
        } catch (error) {
          errors.push({
            task_index: i,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          if (request.execution_options?.fail_fast) {
            break;
          }
        }
      }

      const batchResult: AITaskBatchResult = {
        total_tasks: request.tasks.length,
        successful_tasks: successfulTasks,
        failed_tasks: errors.length,
        total_cost: totalCost,
        total_execution_time: 0,
        results,
        errors
      };

      this.logOperation('info', 'createBatchTasks', {
        totalTasks: request.tasks.length,
        successful: successfulTasks,
        failed: errors.length
      });

      return batchResult;
    });
  }

  /**
   * Execute batch of tasks
   */
  async executeBatch(
    taskIds: string[],
    context?: AITaskExecutionContext
  ): Promise<ServiceResult<AITaskBatchResult>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateArrayLength(taskIds, 'taskIds', 1, 50);

      // This would typically integrate with an AI execution engine
      // For now, we'll just update the tasks to 'in_progress' status
      const results: AITaskExecutionResult[] = [];
      const errors: Array<{ task_index: number; error: string }> = [];

      for (let i = 0; i < taskIds.length; i++) {
        try {
          await this.updateTaskStatus(taskIds[i], 'in_progress');
          results.push({
            task_id: taskIds[i],
            success: true
          });
        } catch (error) {
          errors.push({
            task_index: i,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const batchResult: AITaskBatchResult = {
        total_tasks: taskIds.length,
        successful_tasks: results.length,
        failed_tasks: errors.length,
        total_cost: 0,
        total_execution_time: 0,
        results,
        errors
      };

      return batchResult;
    });
  }

  /**
   * Get tasks by agent ID
   */
  async getTasksByAgent(agentId: string): Promise<ServiceListResult<AITask>> {
    return this.findAITasks({ agent_id: agentId });
  }

  /**
   * Get tasks by parent task ID
   */
  async getTasksByParent(parentTaskId: string): Promise<ServiceListResult<AITask>> {
    const tasks = await this.findAITasks({});

    if (tasks.error) {
      return { data: null, error: tasks.error, total: 0 };
    }

    const filtered = tasks.data?.filter(task => Array.isArray(task.dependencies) && task.dependencies.includes(parentTaskId)) || [];

    return {
      data: filtered,
      error: null,
      total: filtered.length
    };
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(): Promise<ServiceResult<any>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const result = await this.dependencies.aiTaskRepository.getTaskStatistics(
        this.context.userId
      );

      if (result.error) throw result.error;

      return result.data;
    });
  }

  /**
   * Get cost analysis
   */
  async getCostAnalysis(filters?: AITaskFilterParams): Promise<ServiceResult<any>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const tasks = await this.findAITasks(filters || {});
      if (tasks.error) throw tasks.error;

      const analysis = {
        total_estimated_cost: 0,
        total_actual_cost: 0,
        completed_tasks: 0,
        pending_tasks: 0,
        failed_tasks: 0,
        average_cost_per_task: 0,
        cost_by_model: {} as Record<string, number>,
        cost_by_type: {} as Record<string, number>
      };

      tasks.data!.forEach(task => {
        const estimatedCost = task.estimated_cost_usd || 0;
        const actualCost = task.actual_cost_usd || 0;

        analysis.total_estimated_cost += estimatedCost;
        analysis.total_actual_cost += actualCost;

        if (task.status === 'completed') analysis.completed_tasks++;
        else if (task.status === 'pending') analysis.pending_tasks++;
        else if (task.status === 'failed') analysis.failed_tasks++;

        const executionModel = (task.execution_result as any)?.model_used;
        const configuredModel = task.metadata?.model;
        const model = executionModel || configuredModel;
        if (model) {
          analysis.cost_by_model[model] = (analysis.cost_by_model[model] || 0) + actualCost;
        }

        analysis.cost_by_type[task.task_type] = (analysis.cost_by_type[task.task_type] || 0) + actualCost;
      });

      if (tasks.data!.length > 0) {
        analysis.average_cost_per_task = analysis.total_actual_cost / tasks.data!.length;
      }

      return analysis;
    });
  }

  private enrichTask(task: AITask): AITask {
    const priority = task.metadata?.priority as ('low' | 'medium' | 'high' | 'urgent' | undefined);
    const tags = Array.isArray(task.metadata?.tags) ? task.metadata.tags : [];

    return {
      ...task,
      priority,
      tags
    };
  }

  /**
   * Validate task execution
   */
  async validateTaskExecution(
    task: AITask,
    context?: AITaskExecutionContext
  ): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      const errors: string[] = [];

      // Check cost constraints
      if (context?.cost_constraints?.max_cost_per_task) {
        if ((task.estimated_cost_usd || 0) > context.cost_constraints.max_cost_per_task) {
          errors.push('Task estimated cost exceeds per-task limit');
        }
      }

      // Check status
      if (task.status !== 'pending') {
        errors.push('Task must be in pending status to execute');
      }

      // Check deadline
      if (task.due_at && new Date(task.due_at) < new Date()) {
        errors.push('Task deadline has passed');
      }

      // Check retry limits
      const retryCount = Number(task.metadata?.retry_count ?? 0);
      const maxRetries = Number(task.metadata?.max_retries ?? 3);
      if (retryCount >= maxRetries) {
        errors.push('Task has exceeded maximum retry attempts');
      }

      if (errors.length > 0) {
        throw new ValidationError('Task validation failed', { errors });
      }

      return true;
    });
  }

  /**
   * Estimate task cost
   */
  async estimateTaskCost(request: AITaskCreateRequest): Promise<ServiceResult<number>> {
    return this.safeOperation(async () => {
      // Simple cost estimation based on model and estimated tokens
      // In a real implementation, this would use more sophisticated pricing models

      const baseCosts = {
        'gpt-4': 0.03,
        'gpt-3.5-turbo': 0.002,
        'claude-3-opus': 0.015,
        'claude-3-sonnet': 0.003,
        'claude-3-haiku': 0.0005
      };

      const modelCost = baseCosts[request.model as keyof typeof baseCosts] || 0.01;
      const estimatedTokens = request.max_tokens || 1000;

      const estimatedCost = (estimatedTokens / 1000) * modelCost;

      return Math.round(estimatedCost * 100) / 100; // Round to 2 decimal places
    });
  }

  /**
   * Validate task create request
   */
  private async validateTaskCreateRequest(request: AITaskCreateRequest): Promise<void> {
    const errors: string[] = [];

    // Validate task type
    const validTypes = ['generation', 'analysis', 'summarization', 'classification', 'translation', 'conversation', 'coding', 'reasoning', 'other'];
    if (!validTypes.includes(request.task_type)) {
      errors.push('Invalid task type');
    }

    // Validate priority
    if (request.priority && !['low', 'medium', 'high', 'urgent'].includes(request.priority)) {
      errors.push('Invalid priority level');
    }

    // Validate status if provided
    if (request.status && !['pending', 'assigned', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'].includes(request.status)) {
      errors.push('Invalid task status');
    }

    // Validate execution mode
    if (request.mode && !['plan_only', 'dry_run', 'execute'].includes(request.mode)) {
      errors.push('Invalid execution mode');
    }

    // Validate model parameters
    if (request.temperature !== undefined) {
      this.validateNumericRange(request.temperature, 'temperature', 0, 2);
    }

    if (request.top_p !== undefined) {
      this.validateNumericRange(request.top_p, 'top_p', 0, 1);
    }

    if (request.max_tokens !== undefined) {
      this.validateNumericRange(request.max_tokens, 'max_tokens', 1, 100000);
    }

    // Check if related entities exist (if provided)
    if (request.task_id) {
      const relatedTask = await this.dependencies.taskRepository.findByUserAndId(
        this.context.userId,
        request.task_id
      );
      if (!relatedTask.data) {
        errors.push('Related task not found');
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Task creation validation failed', { errors });
    }
  }

  /**
   * Validate status transition
   */
  private async validateStatusTransition(currentStatus: string, newStatus: string): Promise<void> {
    const validTransitions: Record<string, string[]> = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'failed', 'cancelled'],
      'completed': [], // Generally immutable
      'failed': ['pending'], // Allow retry
      'cancelled': ['pending'] // Allow restart
    };

    const allowedNextStates = validTransitions[currentStatus] || [];
    if (!allowedNextStates.includes(newStatus)) {
      throw new BusinessRuleError(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }
}
