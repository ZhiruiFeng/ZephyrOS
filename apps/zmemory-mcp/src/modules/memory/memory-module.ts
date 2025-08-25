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

    const response = await this.client.post('/api/memories', {
      type: params.type,
      content: params.content,
      tags: params.tags,
      metadata: params.metadata,
    });
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

    const updateData: any = {};
    if (params.content !== undefined) updateData.content = params.content;
    if (params.tags !== undefined) updateData.tags = params.tags;
    if (params.metadata !== undefined) updateData.metadata = params.metadata;

    const response = await this.client.put(`/api/memories/${params.id}`, updateData);
    return response.data;
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