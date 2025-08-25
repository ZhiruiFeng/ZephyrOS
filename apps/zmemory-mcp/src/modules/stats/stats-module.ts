import { AxiosInstance } from 'axios';
import {
  Memory,
  MemoryStats,
  OAuthError,
  AuthState,
} from '../../types.js';

export class StatsModule {
  constructor(
    private client: AxiosInstance,
    private authState: AuthState,
    private searchMemories: (params?: any) => Promise<Memory[]>
  ) {}

  async getStats(): Promise<MemoryStats> {
    if (!this.isAuthenticated()) {
      throw new OAuthError('需要认证', 'authentication_required', '请先进行OAuth认证');
    }

    try {
      const response = await this.client.get('/api/tasks/stats');
      return response.data || this.getDefaultStats();
    } catch (error) {
      try {
        const memories = await this.searchMemories({ limit: 1000, offset: 0 });
        return this.calculateStats(memories);
      } catch (searchError) {
        return this.getDefaultStats();
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }

  private getDefaultStats(): MemoryStats {
    return {
      total: 0,
      by_type: {},
      by_status: {},
      by_priority: {},
      recent_count: 0,
    };
  }

  private calculateStats(memories: Memory[]): MemoryStats {
    const stats: MemoryStats = {
      total: memories.length,
      by_type: {},
      by_status: {},
      by_priority: {},
      recent_count: 0,
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    memories.forEach(memory => {
      stats.by_type[memory.type] = (stats.by_type[memory.type] || 0) + 1;
      
      const status = memory.content?.status || 'unknown';
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;
      
      const priority = memory.content?.priority || 'unknown';
      stats.by_priority[priority] = (stats.by_priority[priority] || 0) + 1;
      
      if (new Date(memory.created_at) > oneDayAgo) {
        stats.recent_count++;
      }
    });

    return stats;
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