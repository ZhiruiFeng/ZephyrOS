import { BaseServiceImpl } from './base-service';
import type {
  ServiceContext,
  ServiceDependencies,
  ServiceResult
} from './types';
import type {
  MindflowSTTInteraction,
  MindflowSTTInteractionFilterParams,
  CreateMindflowSTTInteractionInput,
  UpdateMindflowSTTInteractionInput
} from '../database/types';
import { createMindflowSTTInteractionRepository } from '../database';

export interface MindflowSTTInteractionService {
  getInteractions(filters?: MindflowSTTInteractionFilterParams): Promise<ServiceResult<MindflowSTTInteraction[]>>;
  getInteraction(interactionId: string): Promise<ServiceResult<MindflowSTTInteraction>>;
  createInteraction(data: CreateMindflowSTTInteractionInput): Promise<ServiceResult<MindflowSTTInteraction>>;
  updateInteraction(interactionId: string, data: UpdateMindflowSTTInteractionInput): Promise<ServiceResult<MindflowSTTInteraction>>;
  deleteInteraction(interactionId: string): Promise<ServiceResult<boolean>>;
}

export class MindflowSTTInteractionServiceImpl extends BaseServiceImpl implements MindflowSTTInteractionService {
  private mindflowSTTInteractionRepo = createMindflowSTTInteractionRepository();

  constructor(context: ServiceContext, dependencies: ServiceDependencies) {
    super(context, dependencies);
  }

  /**
   * Get all MindFlow STT interactions for the user
   */
  async getInteractions(filters: MindflowSTTInteractionFilterParams = {}): Promise<ServiceResult<MindflowSTTInteraction[]>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getMindflowSTTInteractionsStarted', { filters });

      const result = await this.mindflowSTTInteractionRepo.findAllByUser(this.context.userId, filters);

      if (result.error) {
        this.logOperation('error', 'getMindflowSTTInteractionsFailed', {
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'getMindflowSTTInteractionsSuccess', {
        count: result.data?.length || 0,
        total: result.total
      });

      return result.data || [];
    });
  }

  /**
   * Get a single MindFlow STT interaction by ID
   */
  async getInteraction(interactionId: string): Promise<ServiceResult<MindflowSTTInteraction>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'getMindflowSTTInteractionStarted', { interactionId });

      const result = await this.mindflowSTTInteractionRepo.findByUserAndId(this.context.userId, interactionId);

      if (result.error) {
        this.logOperation('error', 'getMindflowSTTInteractionFailed', {
          interactionId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('MindFlow STT interaction not found');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'getMindflowSTTInteractionSuccess', { interactionId });

      return result.data;
    });
  }

  /**
   * Create a new MindFlow STT interaction
   */
  async createInteraction(data: CreateMindflowSTTInteractionInput): Promise<ServiceResult<MindflowSTTInteraction>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'createMindflowSTTInteractionStarted', {
        transcription_api: data.transcription_api,
        has_refinement: !!data.refined_text
      });

      const result = await this.mindflowSTTInteractionRepo.createInteraction(this.context.userId, data);

      if (result.error) {
        this.logOperation('error', 'createMindflowSTTInteractionFailed', {
          error: result.error.message,
          transcription_api: data.transcription_api
        });
        throw result.error;
      }

      this.logOperation('info', 'createMindflowSTTInteractionSuccess', {
        interactionId: result.data?.id,
        transcription_api: result.data?.transcription_api
      });

      return result.data!;
    });
  }

  /**
   * Update an existing MindFlow STT interaction
   */
  async updateInteraction(interactionId: string, data: UpdateMindflowSTTInteractionInput): Promise<ServiceResult<MindflowSTTInteraction>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'updateMindflowSTTInteractionStarted', { interactionId, updates: data });

      const result = await this.mindflowSTTInteractionRepo.updateInteraction(this.context.userId, interactionId, data);

      if (result.error) {
        this.logOperation('error', 'updateMindflowSTTInteractionFailed', {
          interactionId,
          error: result.error.message
        });
        throw result.error;
      }

      if (!result.data) {
        const error = new Error('MindFlow STT interaction not found');
        (error as any).code = '404';
        throw error;
      }

      this.logOperation('info', 'updateMindflowSTTInteractionSuccess', { interactionId });

      return result.data;
    });
  }

  /**
   * Delete a MindFlow STT interaction
   */
  async deleteInteraction(interactionId: string): Promise<ServiceResult<boolean>> {
    return this.safeOperation(async () => {
      this.logOperation('info', 'deleteMindflowSTTInteractionStarted', { interactionId });

      const result = await this.mindflowSTTInteractionRepo.deleteInteraction(this.context.userId, interactionId);

      if (result.error) {
        this.logOperation('error', 'deleteMindflowSTTInteractionFailed', {
          interactionId,
          error: result.error.message
        });
        throw result.error;
      }

      this.logOperation('info', 'deleteMindflowSTTInteractionSuccess', { interactionId });

      return true;
    });
  }
}
