import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  RepositoryResult,
  RepositoryListResult,
  TaskRelation,
  TaskRelationFilterParams,
  CreateTaskRelationInput
} from '../types';
import { RepositoryError } from '../types';

export interface TaskRelationRepository {
  findByUserWithFilters(userId: string, filters?: TaskRelationFilterParams): Promise<RepositoryListResult<TaskRelation>>;
  createRelation(userId: string, data: CreateTaskRelationInput): Promise<RepositoryResult<TaskRelation>>;
  deleteRelation(userId: string, relationId: string): Promise<RepositoryResult<boolean>>;
  checkTasksExist(userId: string, taskIds: string[]): Promise<RepositoryResult<boolean>>;
  checkRelationExists(userId: string, parentTaskId: string, childTaskId: string, relationType: string): Promise<RepositoryResult<boolean>>;
}

export class TaskRelationRepositoryImpl extends BaseRepository<TaskRelation> implements TaskRelationRepository {
  constructor(client: DatabaseClient) {
    super(client, 'task_relations', `
      *,
      parent_task:tasks!parent_task_id(id, title, status, priority),
      child_task:tasks!child_task_id(id, title, status, priority)
    `);
  }

  /**
   * Find task relations with optional filtering
   * Includes joined task details
   */
  async findByUserWithFilters(userId: string, filters: TaskRelationFilterParams = {}): Promise<RepositoryListResult<TaskRelation>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.defaultSelect, { count: 'exact' })
        .eq('user_id', userId);

      // Filter by task_id (either parent or child)
      if (filters.task_id) {
        query = query.or(`parent_task_id.eq.${filters.task_id},child_task_id.eq.${filters.task_id}`);
      }

      // Filter by specific parent or child
      if (filters.parent_task_id) {
        query = query.eq('parent_task_id', filters.parent_task_id);
      }

      if (filters.child_task_id) {
        query = query.eq('child_task_id', filters.child_task_id);
      }

      // Filter by relation type
      if (filters.relation_type) {
        query = query.eq('relation_type', filters.relation_type);
      }

      // Pagination
      if (filters.limit !== undefined) {
        query = query.limit(filters.limit);
      }

      if (filters.offset !== undefined) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      // Default ordering: newest first
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Database error finding task relations:', error);
        return { data: null, error: new RepositoryError('Failed to find task relations', error.code), total: 0 };
      }

      return {
        data: (data as unknown as TaskRelation[]) || [],
        error: null,
        total: count || 0
      };
    } catch (error) {
      console.error('Error finding task relations:', error);
      return { data: null, error: error as Error, total: 0 };
    }
  }

  /**
   * Create a new task relation
   */
  async createRelation(userId: string, data: CreateTaskRelationInput): Promise<RepositoryResult<TaskRelation>> {
    try {
      const relationData = {
        ...data,
        user_id: userId
      };

      const { data: relation, error } = await this.client
        .from(this.tableName)
        .insert(relationData)
        .select(this.defaultSelect)
        .single();

      if (error) {
        console.error('Database error creating task relation:', error);
        return { data: null, error: new RepositoryError('Failed to create task relation', error.code) };
      }

      return { data: relation as unknown as TaskRelation, error: null };
    } catch (error) {
      console.error('Error creating task relation:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete a task relation
   */
  async deleteRelation(userId: string, relationId: string): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', relationId)
        .eq('user_id', userId);

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: false, error: new RepositoryError('任务关系不存在', '404') };
        }
        console.error('Database error deleting task relation:', error);
        return { data: false, error: new RepositoryError('Failed to delete task relation', error.code) };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error deleting task relation:', error);
      return { data: false, error: error as Error };
    }
  }

  /**
   * Check if tasks exist and belong to user
   */
  async checkTasksExist(userId: string, taskIds: string[]): Promise<RepositoryResult<boolean>> {
    try {
      const { data: tasks, error } = await this.client
        .from('tasks')
        .select('id')
        .in('id', taskIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Database error checking tasks existence:', error);
        return { data: false, error: new RepositoryError('Failed to check tasks existence', error.code) };
      }

      // All tasks must exist
      const allExist = tasks && tasks.length === taskIds.length;
      return { data: allExist, error: null };
    } catch (error) {
      console.error('Error checking tasks existence:', error);
      return { data: false, error: error as Error };
    }
  }

  /**
   * Check if a relation already exists
   */
  async checkRelationExists(
    userId: string,
    parentTaskId: string,
    childTaskId: string,
    relationType: string
  ): Promise<RepositoryResult<boolean>> {
    try {
      const { data: relation, error } = await this.client
        .from(this.tableName)
        .select('id')
        .eq('parent_task_id', parentTaskId)
        .eq('child_task_id', childTaskId)
        .eq('relation_type', relationType)
        .eq('user_id', userId)
        .single();

      if (error) {
        // PGRST116 means not found, which is what we want
        if (error.code === 'PGRST116') {
          return { data: false, error: null };
        }
        console.error('Database error checking relation existence:', error);
        return { data: false, error: new RepositoryError('Failed to check relation existence', error.code) };
      }

      return { data: !!relation, error: null };
    } catch (error) {
      console.error('Error checking relation existence:', error);
      return { data: false, error: error as Error };
    }
  }
}
