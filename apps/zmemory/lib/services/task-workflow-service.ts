import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult,
  ServiceListResult,
  StatusChangeContext,
  CompletionResult,
  ValidationResult,
  TreeOptions,
  TaskTree,
  TaskTreeNode
} from './types';
import type { Task, TaskFilterParams, CreateSubtaskRequest } from '@/database';
import { BusinessRuleError, ValidationError, NotFoundError } from './types';

export interface TaskWorkflowService {
  updateTaskStatus(taskId: string, status: string, context?: StatusChangeContext): Promise<ServiceResult<Task>>;
  handleTaskCompletion(taskId: string, context?: StatusChangeContext): Promise<ServiceResult<CompletionResult>>;
  calculateTaskProgress(taskId: string): Promise<ServiceResult<number>>;
  validateStatusTransition(currentStatus: string, newStatus: string): Promise<ServiceResult<ValidationResult>>;
  cascadeStatusChanges(taskId: string, newStatus: string): Promise<ServiceResult<string[]>>;
  createSubtaskWithValidation(request: CreateSubtaskRequest): Promise<ServiceResult<Task>>;
  reorderSubtasks(parentId: string, orderedSubtaskIds: string[]): Promise<ServiceResult<void>>;
}

export interface TaskHierarchyService {
  buildTaskTree(rootTaskId: string, options?: TreeOptions): Promise<ServiceResult<TaskTree>>;
  moveTaskInHierarchy(taskId: string, newParentId: string, order: number): Promise<ServiceResult<void>>;
  calculateHierarchyPath(taskId: string): Promise<ServiceResult<string>>;
  validateHierarchyRules(taskId: string, parentId?: string): Promise<ServiceResult<ValidationResult>>;
  getTaskDepth(taskId: string): Promise<ServiceResult<number>>;
}

export class TaskWorkflowServiceImpl extends BaseServiceImpl implements TaskWorkflowService {

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Update task status with business rule validation and side effects
   */
  async updateTaskStatus(
    taskId: string,
    status: string,
    context: StatusChangeContext = {}
  ): Promise<ServiceResult<Task>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');
      this.validateRequired(status, 'status');

      // Get current task
      const { data: currentTask, error: fetchError } = await this.dependencies.taskRepository.findByUserAndId(
        this.context.userId,
        taskId
      );

      if (fetchError) throw fetchError;
      if (!currentTask) throw new NotFoundError('Task', taskId);

      // Validate status transition
      const validation = await this.validateStatusTransition(currentTask.content.status, status);
      if (validation.error) throw validation.error;
      if (!validation.data!.valid) {
        throw new BusinessRuleError(
          `Invalid status transition from ${currentTask.content.status} to ${status}`,
          { errors: validation.data!.errors }
        );
      }

      // Build update object with business rules
      const updates: Partial<Task> = {
        content: {
          ...currentTask.content,
          status: status as any
        }
      };

      // Apply status-specific logic
      if (status === 'completed') {
        updates.content!.completion_date = new Date().toISOString();

        // Auto-set progress to 100% if not already set
        if (context.progress === undefined && currentTask.content.progress < 100) {
          updates.content!.progress = 100;
        }
      }

      // Clear completion date if moving away from completed
      if (currentTask.content.status === 'completed' && status !== 'completed') {
        updates.content!.completion_date = undefined;
      }

      // Handle progress updates
      if (context.progress !== undefined) {
        this.validateNumericRange(context.progress, 'progress', 0, 100);
        updates.content!.progress = context.progress;
      }

      // Handle notes appending
      if (context.notes) {
        const existingNotes = currentTask.content.notes || '';
        updates.content!.notes = existingNotes
          ? `${existingNotes}\n\n[${new Date().toISOString()}] ${context.notes}`
          : context.notes;
      }

      // Update the task
      const { data: updatedTask, error: updateError } = await this.dependencies.taskRepository.updateTask(
        this.context.userId,
        taskId,
        updates
      );

      if (updateError) throw updateError;

      // Handle cascade effects if requested
      if (context.cascade_to_subtasks) {
        await this.cascadeStatusChanges(taskId, status);
      }

      this.logOperation('info', 'updateTaskStatus', {
        taskId,
        oldStatus: currentTask.content.status,
        newStatus: status,
        context
      });

      return updatedTask!;
    });
  }

  /**
   * Handle task completion with complex business logic
   */
  async handleTaskCompletion(
    taskId: string,
    context: StatusChangeContext = {}
  ): Promise<ServiceResult<CompletionResult>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      // Complete the main task
      const taskResult = await this.updateTaskStatus(taskId, 'completed', context);
      if (taskResult.error) throw taskResult.error;

      const result: CompletionResult = {
        completed_task: taskResult.data!,
        cascaded_tasks: [],
        parent_updates: [],
        notifications: []
      };

      // Get subtasks to handle cascade
      const subtaskFilters: TaskFilterParams = {
        parent_task_id: taskId,
        include_subtasks: true,
        limit: 100
      };

      const { data: subtasks } = await this.dependencies.taskRepository.findTasksAdvanced(
        this.context.userId,
        subtaskFilters
      );

      // Handle subtask completion based on completion behavior
      if (subtasks && context.cascade_to_subtasks) {
        for (const subtask of subtasks) {
          if (subtask.content.status !== 'completed') {
            const subtaskUpdate = await this.updateTaskStatus(
              subtask.id,
              'completed',
              { trigger_source: 'system' }
            );

            if (subtaskUpdate.data) {
              result.cascaded_tasks.push(subtask.id);
            }
          }
        }
      }

      // Update parent task progress if this task has a parent
      if (taskResult.data!.content.parent_task_id) {
        const parentUpdateResult = await this.updateParentProgress(taskResult.data!.content.parent_task_id);
        if (parentUpdateResult.data) {
          result.parent_updates.push(taskResult.data!.content.parent_task_id);
        }
      }

      // Generate notifications
      result.notifications.push(`Task "${taskResult.data!.content.title}" completed`);

      if (result.cascaded_tasks.length > 0) {
        result.notifications.push(`${result.cascaded_tasks.length} subtasks auto-completed`);
      }

      if (result.parent_updates.length > 0) {
        result.notifications.push('Parent task progress updated');
      }

      return result;
    });
  }

  /**
   * Calculate task progress based on subtasks and completion rules
   */
  async calculateTaskProgress(taskId: string): Promise<ServiceResult<number>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      // Get the task
      const { data: task, error } = await this.dependencies.taskRepository.findByUserAndId(
        this.context.userId,
        taskId
      );

      if (error) throw error;
      if (!task) throw new NotFoundError('Task', taskId);

      // If manual progress calculation, return current progress
      if (task.content.progress_calculation === 'manual') {
        return task.content.progress;
      }

      // Get subtasks for automatic calculation
      const subtaskFilters: TaskFilterParams = {
        parent_task_id: taskId,
        include_subtasks: true,
        limit: 100
      };

      const { data: subtasks } = await this.dependencies.taskRepository.findTasksAdvanced(
        this.context.userId,
        subtaskFilters
      );

      if (!subtasks || subtasks.length === 0) {
        // No subtasks, return current progress
        return task.content.progress;
      }

      // Calculate based on completion behavior
      let calculatedProgress = 0;

      if (task.content.progress_calculation === 'average_subtasks') {
        // Simple average of subtask progress
        const totalProgress = subtasks.reduce((sum, subtask) => sum + subtask.content.progress, 0);
        calculatedProgress = totalProgress / subtasks.length;
      } else if (task.content.progress_calculation === 'weighted_subtasks') {
        // Weighted by estimated duration (if available)
        let totalWeight = 0;
        let weightedProgress = 0;

        subtasks.forEach(subtask => {
          const weight = subtask.content.estimated_duration || 1; // Default weight of 1
          totalWeight += weight;
          weightedProgress += (subtask.content.progress * weight);
        });

        calculatedProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;
      }

      return Math.round(calculatedProgress);
    });
  }

  /**
   * Validate status transition rules
   */
  async validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): Promise<ServiceResult<ValidationResult>> {
    return this.safeOperation(async () => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Define valid transitions
      const validTransitions: Record<string, string[]> = {
        'pending': ['in_progress', 'on_hold', 'cancelled'],
        'in_progress': ['completed', 'on_hold', 'cancelled', 'pending'],
        'completed': ['in_progress'], // Allow reopening
        'cancelled': ['pending', 'in_progress'],
        'on_hold': ['pending', 'in_progress', 'cancelled']
      };

      // Check if transition is allowed
      const allowedNextStates = validTransitions[currentStatus] || [];
      if (!allowedNextStates.includes(newStatus)) {
        errors.push(`Cannot transition from ${currentStatus} to ${newStatus}`);
      }

      // Add business rule warnings
      if (currentStatus === 'completed' && newStatus === 'in_progress') {
        warnings.push('Reopening a completed task');
      }

      if (currentStatus === 'in_progress' && newStatus === 'cancelled') {
        warnings.push('Cancelling an in-progress task');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    });
  }

  /**
   * Cascade status changes to related tasks
   */
  async cascadeStatusChanges(taskId: string, newStatus: string): Promise<ServiceResult<string[]>> {
    return this.safeOperation(async () => {
      const affectedTasks: string[] = [];

      // Get subtasks
      const subtaskFilters: TaskFilterParams = {
        parent_task_id: taskId,
        include_subtasks: true,
        limit: 100
      };

      const { data: subtasks } = await this.dependencies.taskRepository.findTasksAdvanced(
        this.context.userId,
        subtaskFilters
      );

      if (subtasks) {
        for (const subtask of subtasks) {
          // Apply cascade rules
          let cascadeStatus: string | null = null;

          if (newStatus === 'cancelled') {
            // Cancel all subtasks when parent is cancelled
            cascadeStatus = 'cancelled';
          } else if (newStatus === 'on_hold') {
            // Put active subtasks on hold
            if (subtask.content.status === 'in_progress') {
              cascadeStatus = 'on_hold';
            }
          } else if (newStatus === 'in_progress') {
            // Resume on-hold subtasks when parent resumes
            if (subtask.content.status === 'on_hold') {
              cascadeStatus = 'pending';
            }
          }

          if (cascadeStatus && cascadeStatus !== subtask.content.status) {
            const updateResult = await this.updateTaskStatus(
              subtask.id,
              cascadeStatus,
              { trigger_source: 'system' }
            );

            if (updateResult.data) {
              affectedTasks.push(subtask.id);
            }
          }
        }
      }

      return affectedTasks;
    });
  }

  /**
   * Create subtask with hierarchy validation
   */
  async createSubtaskWithValidation(request: CreateSubtaskRequest): Promise<ServiceResult<Task>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(request.parent_task_id, 'parent_task_id');
      this.validateRequired(request.task_data.content?.title, 'task title');

      // Validate hierarchy rules
      const hierarchyValidation = await this.validateHierarchyRules(
        'new-task',
        request.parent_task_id
      );

      if (hierarchyValidation.error) throw hierarchyValidation.error;
      if (!hierarchyValidation.data!.valid) {
        throw new BusinessRuleError(
          'Hierarchy validation failed',
          { errors: hierarchyValidation.data!.errors }
        );
      }

      // Create the subtask
      const { data: subtask, error } = await this.dependencies.taskRepository.createSubtask(
        this.context.userId,
        request
      );

      if (error) throw error;

      // Update parent task's subtask count and progress if needed
      await this.updateParentProgress(request.parent_task_id);

      this.logOperation('info', 'createSubtaskWithValidation', {
        parentTaskId: request.parent_task_id,
        subtaskId: subtask!.id,
        subtaskTitle: subtask!.content.title
      });

      return subtask!;
    });
  }

  /**
   * Reorder subtasks within a parent
   */
  async reorderSubtasks(parentId: string, orderedSubtaskIds: string[]): Promise<ServiceResult<void>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(parentId, 'parentId');
      this.validateArrayLength(orderedSubtaskIds, 'orderedSubtaskIds', 1);

      // Validate all subtasks belong to the parent and user
      for (let i = 0; i < orderedSubtaskIds.length; i++) {
        const subtaskId = orderedSubtaskIds[i];

        const { data: subtask } = await this.dependencies.taskRepository.findByUserAndId(
          this.context.userId,
          subtaskId
        );

        if (!subtask) {
          throw new NotFoundError('Subtask', subtaskId);
        }

        if (subtask.content.parent_task_id !== parentId) {
          throw new BusinessRuleError(`Subtask ${subtaskId} does not belong to parent ${parentId}`);
        }

        // Update the subtask order
        await this.dependencies.taskRepository.updateTask(
          this.context.userId,
          subtaskId,
          {
            content: {
              ...subtask.content,
              subtask_order: i
            }
          } as Partial<Task>
        );
      }

      this.logOperation('info', 'reorderSubtasks', {
        parentId,
        newOrder: orderedSubtaskIds
      });
    });
  }

  /**
   * Update parent task progress based on subtasks
   */
  private async updateParentProgress(parentTaskId: string): Promise<ServiceResult<Task | null>> {
    try {
      const progressResult = await this.calculateTaskProgress(parentTaskId);
      if (progressResult.error) return { data: null, error: progressResult.error };

      const newProgress = progressResult.data!;

      // Get parent task
      const { data: parentTask } = await this.dependencies.taskRepository.findByUserAndId(
        this.context.userId,
        parentTaskId
      );

      if (!parentTask) return { data: null, error: null };

      // Only update if progress calculation is automatic and progress changed
      if (parentTask.content.progress_calculation !== 'manual' &&
          parentTask.content.progress !== newProgress) {

        const { data: updatedTask } = await this.dependencies.taskRepository.updateTask(
          this.context.userId,
          parentTaskId,
          {
            content: {
              ...parentTask.content,
              progress: newProgress
            }
          } as Partial<Task>
        );

        return { data: updatedTask, error: null };
      }

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Validate hierarchy rules (max depth, circular references, etc.)
   */
  private async validateHierarchyRules(
    taskId: string,
    parentId?: string
  ): Promise<ServiceResult<ValidationResult>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (parentId) {
        // Check if parent exists and belongs to user
        const { data: parentTask } = await this.dependencies.taskRepository.findByUserAndId(
          this.context.userId,
          parentId
        );

        if (!parentTask) {
          errors.push('Parent task not found');
          return { data: { valid: false, errors, warnings }, error: null };
        }

        // Check for circular reference (if not a new task)
        if (taskId !== 'new-task') {
          let currentParent = parentTask;
          let depth = 0;
          const maxDepth = 10;

          while (currentParent.content.parent_task_id && depth < maxDepth) {
            depth++;

            if (currentParent.content.parent_task_id === taskId) {
              errors.push('Cannot create circular task hierarchy');
              break;
            }

            const { data: nextParent } = await this.dependencies.taskRepository.findByUserAndId(
              this.context.userId,
              currentParent.content.parent_task_id
            );

            if (!nextParent) break;
            currentParent = nextParent;
          }

          if (depth >= maxDepth) {
            warnings.push('Task hierarchy is very deep, consider flattening');
          }
        }
      }

      return {
        data: {
          valid: errors.length === 0,
          errors,
          warnings
        },
        error: null
      };
    } catch (error) {
      return {
        data: { valid: false, errors: ['Validation failed'], warnings },
        error: error as Error
      };
    }
  }
}

export class TaskHierarchyServiceImpl extends BaseServiceImpl implements TaskHierarchyService {

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Build complete task tree with metadata
   */
  async buildTaskTree(rootTaskId: string, options: TreeOptions = {}): Promise<ServiceResult<TaskTree>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(rootTaskId, 'rootTaskId');

      const maxDepth = options.max_depth || 10;
      const includeCompleted = options.include_completed !== false;
      const includeArchived = options.include_archived === true;

      // Get all tasks in the hierarchy
      const filters: TaskFilterParams = {
        limit: 1000 // Large limit to get full hierarchy
      };

      if (!includeCompleted) {
        // Would need to implement status filtering in repository
      }

      const { data: allTasks } = await this.dependencies.taskRepository.findTasksAdvanced(
        this.context.userId,
        filters
      );

      if (!allTasks) {
        throw new Error('Failed to fetch tasks for tree building');
      }

      // Build the tree starting from root
      const treeNode = await this.buildTreeNode(rootTaskId, allTasks, maxDepth, 0);

      if (!treeNode) {
        throw new NotFoundError('Root task', rootTaskId);
      }

      // Calculate tree statistics
      const stats = this.calculateTreeStats(treeNode);

      const tree: TaskTree = {
        root: treeNode,
        total_nodes: stats.totalNodes,
        max_depth_reached: stats.maxDepth,
        completion_stats: stats.completionStats
      };

      return tree;
    });
  }

  /**
   * Move task to different parent in hierarchy
   */
  async moveTaskInHierarchy(
    taskId: string,
    newParentId: string,
    order: number
  ): Promise<ServiceResult<void>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();
      this.validateRequired(taskId, 'taskId');
      this.validateNumericRange(order, 'order', 0);

      // Validate hierarchy rules for the move
      const validation = await this.validateHierarchyRules(taskId, newParentId);
      if (validation.error) throw validation.error;
      if (!validation.data!.valid) {
        throw new BusinessRuleError(
          'Cannot move task: hierarchy rules violated',
          { errors: validation.data!.errors }
        );
      }

      // Get the task
      const { data: task } = await this.dependencies.taskRepository.findByUserAndId(
        this.context.userId,
        taskId
      );

      if (!task) throw new NotFoundError('Task', taskId);

      // Update the task with new parent and order
      await this.dependencies.taskRepository.updateTask(
        this.context.userId,
        taskId,
        {
          content: {
            ...task.content,
            parent_task_id: newParentId || undefined,
            subtask_order: order
          }
        } as Partial<Task>
      );

      this.logOperation('info', 'moveTaskInHierarchy', {
        taskId,
        oldParent: task.content.parent_task_id,
        newParent: newParentId,
        newOrder: order
      });
    });
  }

  /**
   * Calculate hierarchy path for a task
   */
  async calculateHierarchyPath(taskId: string): Promise<ServiceResult<string>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      const path: string[] = [];
      let currentTaskId: string | undefined = taskId;
      const visited = new Set<string>();

      while (currentTaskId && !visited.has(currentTaskId)) {
        visited.add(currentTaskId);

        const { data: task } = await this.dependencies.taskRepository.findByUserAndId(
          this.context.userId,
          currentTaskId
        );

        if (!task) break;

        path.unshift(task.content.title);
        currentTaskId = task.content.parent_task_id;
      }

      return path.join(' > ');
    });
  }

  /**
   * Validate hierarchy rules for task operations
   */
  async validateHierarchyRules(taskId: string, parentId?: string): Promise<ServiceResult<ValidationResult>> {
    // This would use the same logic as in TaskWorkflowServiceImpl
    // Extracted into a shared method or utility
    return { data: { valid: true, errors: [], warnings: [] }, error: null };
  }

  /**
   * Get the depth of a task in the hierarchy
   */
  async getTaskDepth(taskId: string): Promise<ServiceResult<number>> {
    return this.safeOperation(async () => {
      this.validateUserAccess();

      let depth = 0;
      let currentTaskId: string | undefined = taskId;
      const visited = new Set<string>();

      while (currentTaskId && !visited.has(currentTaskId)) {
        visited.add(currentTaskId);

        const { data: task } = await this.dependencies.taskRepository.findByUserAndId(
          this.context.userId,
          currentTaskId
        );

        if (!task || !task.content.parent_task_id) break;

        depth++;
        currentTaskId = task.content.parent_task_id;
      }

      return depth;
    });
  }

  /**
   * Build a tree node recursively
   */
  private async buildTreeNode(
    taskId: string,
    allTasks: Task[],
    maxDepth: number,
    currentDepth: number
  ): Promise<TaskTreeNode | null> {
    if (currentDepth >= maxDepth) return null;

    const task = allTasks.find(t => t.id === taskId);
    if (!task) return null;

    const children: TaskTreeNode[] = [];

    // Find direct children
    const childTasks = allTasks
      .filter(t => t.content.parent_task_id === taskId)
      .sort((a, b) => a.content.subtask_order - b.content.subtask_order);

    for (const childTask of childTasks) {
      const childNode = await this.buildTreeNode(
        childTask.id,
        allTasks,
        maxDepth,
        currentDepth + 1
      );
      if (childNode) {
        children.push(childNode);
      }
    }

    return {
      id: task.id,
      title: task.content.title,
      status: task.content.status,
      progress: task.content.progress,
      hierarchy_level: currentDepth,
      subtask_order: task.content.subtask_order,
      parent_id: task.content.parent_task_id,
      children,
      metadata: {
        subtask_count: children.length,
        completion_percentage: this.calculateNodeCompletion(children),
        estimated_duration: task.content.estimated_duration
      }
    };
  }

  /**
   * Calculate completion percentage for a node based on children
   */
  private calculateNodeCompletion(children: TaskTreeNode[]): number {
    if (children.length === 0) return 0;

    const totalProgress = children.reduce((sum, child) => sum + child.progress, 0);
    return Math.round(totalProgress / children.length);
  }

  /**
   * Calculate tree statistics
   */
  private calculateTreeStats(root: TaskTreeNode) {
    let totalNodes = 0;
    let maxDepth = 0;
    const statusCounts = { total: 0, completed: 0, in_progress: 0, pending: 0 };

    const traverse = (node: TaskTreeNode, depth: number) => {
      totalNodes++;
      maxDepth = Math.max(maxDepth, depth);

      statusCounts.total++;
      if (node.status === 'completed') statusCounts.completed++;
      else if (node.status === 'in_progress') statusCounts.in_progress++;
      else if (node.status === 'pending') statusCounts.pending++;

      node.children.forEach(child => traverse(child, depth + 1));
    };

    traverse(root, 0);

    return {
      totalNodes,
      maxDepth,
      completionStats: statusCounts
    };
  }
}