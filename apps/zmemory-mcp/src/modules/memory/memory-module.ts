import { AxiosInstance } from 'axios';
import {
  Memory,
  AddMemoryParams,
  UpdateMemoryParams,
  OAuthError,
  AuthState,
} from '../../types.js';

export class MemoryModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState
  ) {}

  async addMemory(params: AddMemoryParams): Promise<Memory> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    // Transform params to match ZMemory API format
    const memoryData = {
      note: params.note,
      memory_type: params.memory_type || 'note',
      title: params.title,
      emotion_valence: params.emotion_valence,
      emotion_arousal: params.emotion_arousal,
      energy_delta: params.energy_delta,
      place_name: params.place_name,
      latitude: params.latitude,
      longitude: params.longitude,
      is_highlight: params.is_highlight || false,
      salience_score: params.salience_score,
      category_id: params.category_id,
      tags: params.tags,
      happened_range: params.happened_range,
      captured_at: params.captured_at,
    };

    const response = await this.client.post('/api/memories', memoryData);
    return response.data;
  }

  async getMemory(id: string): Promise<Memory> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    const response = await this.client.get(`/api/memories/${id}`);
    return response.data;
  }

  async updateMemory(params: UpdateMemoryParams): Promise<Memory> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    // Transform update params to match ZMemory API format
    const updateData: any = {};
    if (params.note !== undefined) updateData.note = params.note;
    if (params.title !== undefined) updateData.title = params.title;
    if (params.memory_type !== undefined) updateData.memory_type = params.memory_type;
    if (params.emotion_valence !== undefined) updateData.emotion_valence = params.emotion_valence;
    if (params.emotion_arousal !== undefined) updateData.emotion_arousal = params.emotion_arousal;
    if (params.energy_delta !== undefined) updateData.energy_delta = params.energy_delta;
    if (params.place_name !== undefined) updateData.place_name = params.place_name;
    if (params.is_highlight !== undefined) updateData.is_highlight = params.is_highlight;
    if (params.salience_score !== undefined) updateData.salience_score = params.salience_score;
    if (params.tags !== undefined) updateData.tags = params.tags;
    if (params.category_id !== undefined) updateData.category_id = params.category_id;

    const response = await this.client.put(`/api/memories/${params.id}`, updateData);
    return response.data;
  }

  async deleteMemory(id: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    await this.client.delete(`/api/memories/${id}`);
  }

  private isAuthenticated(): boolean {
    if (!this.authState.isAuthenticated || !this.authState.tokens) {
      return false;
    }

    if (this.authState.expiresAt && Date.now() >= this.authState.expiresAt) {
      return false;
    }

    return true;
  }
}