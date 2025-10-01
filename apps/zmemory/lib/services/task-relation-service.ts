import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult
} from './types';
import type {
  TaskRelation,
  TaskRelationFilterParams,
  CreateTaskRelationInput
} from '../database/types';
import { createTaskRelationRepository } from '../database';

export interface TaskRelationService {
  getRelations(filters?: TaskRelationFilterParams): Promise<ServiceResult<TaskRelation[]>>;
  createRelation(data: CreateTaskRelationInput): Promise<ServiceResult<TaskRelation>>;
  deleteRelation(relationId: string): Promise<ServiceResult<boolean>>;
}

export class TaskRelationServiceImpl extends BaseServiceImpl implements TaskRelationService {
  private taskRelationRepo = createTaskRelationRepository();

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Get task relations with optional filtering
   */
  async getRelations(filters: TaskRelationFilterParams = {}): Promise<ServiceResult<TaskRelation[]>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getRelationsStarted', { filters });

      const result = await this.taskRelationRepo.findByUserWithFilters(this.context.userId, filters);

      if (result.error) {
        this.logOperation('error', 'getRelationsFailed', {
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'getRelationsSuccess', {
        count: result.data?.length || 0,
        total: result.total
      });

      return result.data || [];
    });
  }

  /**
   * Create a new task relation
   * Validates that tasks exist and relation doesn't already exist
   */
  async createRelation(data: CreateTaskRelationInput): Promise<ServiceResult<TaskRelation>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'createRelationStarted', {
        parentTaskId: data.parent_task_id,
        childTaskId: data.child_task_id,
        relationType: data.relation_type
      });

      // Check if both tasks exist and belong to the user
      const tasksExistResult = await this.taskRelationRepo.checkTasksExist(
        this.context.userId,
        [data.parent_task_id, data.child_task_id]
      );

      if (tasksExistResult.error) {
        this.logOperation('error', 'createRelationCheckTasksFailed', {
          error: tasksExistResult.error.message
        });
        throw tasksExistResult.error;
      }

      if (!tasksExistResult.data) {
        this.logOperation('warn', 'createRelationTasksNotFound', {
          parentTaskId: data.parent_task_id,
          childTaskId: data.child_task_id
        });
        const error = new Error('任务不存在');
        (error as any).code = '404';
        throw error;
      }

      // Check if relation already exists
      const relationExistsResult = await this.taskRelationRepo.checkRelationExists(
        this.context.userId,
        data.parent_task_id,
        data.child_task_id,
        data.relation_type
      );

      if (relationExistsResult.error) {
        this.logOperation('error', 'createRelationCheckExistsFailed', {
          error: relationExistsResult.error.message
        });
        throw relationExistsResult.error;
      }

      if (relationExistsResult.data) {
        this.logOperation('warn', 'createRelationAlreadyExists', {
          parentTaskId: data.parent_task_id,
          childTaskId: data.child_task_id,
          relationType: data.relation_type
        });
        const error = new Error('任务关系已存在');
        (error as any).code = '400';
        throw error;
      }

      // Create the relation
      const result = await this.taskRelationRepo.createRelation(this.context.userId, data);

      if (result.error) {
        this.logOperation('error', 'createRelationFailed', {
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'createRelationSuccess', {
        relationId: result.data?.id
      });

      return result.data!;
    });
  }

  /**
   * Delete a task relation
   */
  async deleteRelation(relationId: string): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'deleteRelationStarted', { relationId });

      const result = await this.taskRelationRepo.deleteRelation(this.context.userId, relationId);

      if (result.error) {
        this.logOperation('error', 'deleteRelationFailed', {
          relationId,
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'deleteRelationSuccess', { relationId });

      return true;
    });
  }
}
