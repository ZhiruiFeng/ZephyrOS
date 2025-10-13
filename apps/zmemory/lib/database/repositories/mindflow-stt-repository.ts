import { BaseRepository } from './base-repository';
import type {
  DatabaseClient,
  RepositoryResult,
  RepositoryListResult,
  MindflowSTTInteraction,
  MindflowSTTInteractionFilterParams,
  CreateMindflowSTTInteractionInput,
  UpdateMindflowSTTInteractionInput
} from '../types';
import { RepositoryError } from '../types';

export interface MindflowSTTInteractionRepository {
  findByUserAndId(userId: string, interactionId: string): Promise<RepositoryResult<MindflowSTTInteraction>>;
  findAllByUser(userId: string, filters?: MindflowSTTInteractionFilterParams): Promise<RepositoryListResult<MindflowSTTInteraction>>;
  createInteraction(userId: string, data: CreateMindflowSTTInteractionInput): Promise<RepositoryResult<MindflowSTTInteraction>>;
  updateInteraction(userId: string, interactionId: string, updates: UpdateMindflowSTTInteractionInput): Promise<RepositoryResult<MindflowSTTInteraction>>;
  deleteInteraction(userId: string, interactionId: string): Promise<RepositoryResult<boolean>>;
}

export class MindflowSTTInteractionRepositoryImpl extends BaseRepository<MindflowSTTInteraction> implements MindflowSTTInteractionRepository {
  constructor(client: DatabaseClient) {
    super(client, 'mindflow_stt_interactions', '*');
  }

  /**
   * Find interaction by user and ID
   */
  async findByUserAndId(userId: string, interactionId: string): Promise<RepositoryResult<MindflowSTTInteraction>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(this.defaultSelect)
        .eq('user_id', userId)
        .eq('id', interactionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new RepositoryError('MindFlow STT interaction not found', '404') };
        }
        console.error(`Database error finding MindFlow STT interaction:`, error);
        return { data: null, error: new RepositoryError('Failed to get MindFlow STT interaction', error.code) };
      }

      return { data: data as unknown as MindflowSTTInteraction, error: null };
    } catch (error) {
      console.error('Error finding MindFlow STT interaction:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Find all interactions for a user with optional filtering
   */
  async findAllByUser(userId: string, filters?: MindflowSTTInteractionFilterParams): Promise<RepositoryListResult<MindflowSTTInteraction>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select(this.defaultSelect, { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters if provided
      if (filters) {
        if (filters.transcription_api) {
          query = query.eq('transcription_api', filters.transcription_api);
        }

        if (filters.optimization_level) {
          query = query.eq('optimization_level', filters.optimization_level);
        }

        if (filters.output_style) {
          query = query.eq('output_style', filters.output_style);
        }

        if (filters.has_refinement !== undefined) {
          if (filters.has_refinement) {
            query = query.not('refined_text', 'is', null);
          } else {
            query = query.is('refined_text', null);
          }
        }

        if (filters.has_teacher_explanation !== undefined) {
          if (filters.has_teacher_explanation) {
            query = query.not('teacher_explanation', 'is', null);
          } else {
            query = query.is('teacher_explanation', null);
          }
        }

        if (filters.start_date) {
          query = query.gte('created_at', filters.start_date);
        }

        if (filters.end_date) {
          query = query.lte('created_at', filters.end_date);
        }

        // Pagination
        if (filters.limit !== undefined) {
          query = query.limit(filters.limit);
        }

        if (filters.offset !== undefined) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
        }
      }

      // Always order by created_at descending (most recent first)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error(`Database error finding MindFlow STT interactions:`, error);
        return { data: null, error: new RepositoryError('Failed to get MindFlow STT interactions', error.code), total: 0 };
      }

      return {
        data: (data as unknown as MindflowSTTInteraction[]) || [],
        error: null,
        total: count || 0
      };
    } catch (error) {
      console.error('Error finding MindFlow STT interactions:', error);
      return { data: null, error: error as Error, total: 0 };
    }
  }

  /**
   * Create a new interaction
   */
  async createInteraction(userId: string, data: CreateMindflowSTTInteractionInput): Promise<RepositoryResult<MindflowSTTInteraction>> {
    try {
      const interactionData = {
        ...data,
        user_id: userId
      };

      const { data: interaction, error } = await this.client
        .from(this.tableName)
        .insert(interactionData)
        .select()
        .single();

      if (error) {
        console.error('Database error creating MindFlow STT interaction:', error);
        return { data: null, error: new RepositoryError('Failed to create MindFlow STT interaction', error.code) };
      }

      return { data: interaction as unknown as MindflowSTTInteraction, error: null };
    } catch (error) {
      console.error('Error creating MindFlow STT interaction:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update an existing interaction
   */
  async updateInteraction(userId: string, interactionId: string, updates: UpdateMindflowSTTInteractionInput): Promise<RepositoryResult<MindflowSTTInteraction>> {
    try {
      const { data: interaction, error } = await this.client
        .from(this.tableName)
        .update(updates)
        .eq('id', interactionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: null, error: new RepositoryError('MindFlow STT interaction not found', '404') };
        }
        console.error('Database error updating MindFlow STT interaction:', error);
        return { data: null, error: new RepositoryError('Failed to update MindFlow STT interaction', error.code) };
      }

      return { data: interaction as unknown as MindflowSTTInteraction, error: null };
    } catch (error) {
      console.error('Error updating MindFlow STT interaction:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete an interaction
   */
  async deleteInteraction(userId: string, interactionId: string): Promise<RepositoryResult<boolean>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', interactionId)
        .eq('user_id', userId);

      if (error) {
        if (error.code === 'PGRST116') {
          return { data: false, error: new RepositoryError('MindFlow STT interaction not found', '404') };
        }
        console.error('Database error deleting MindFlow STT interaction:', error);
        return { data: false, error: new RepositoryError('Failed to delete MindFlow STT interaction', error.code) };
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error deleting MindFlow STT interaction:', error);
      return { data: false, error: error as Error };
    }
  }
}
