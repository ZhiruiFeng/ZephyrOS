/**
 * ZMemory API Client
 * 
 * 负责与ZMemory API通信的客户端
 */

import axios, { AxiosInstance } from 'axios';
import {
  Memory,
  MemoryStats,
  ZMemoryConfig,
  ZMemoryError,
  AddMemoryParams,
  SearchMemoriesParams,
  UpdateMemoryParams,
} from './types.js';

export class ZMemoryClient {
  private client: AxiosInstance;

  constructor(private config: ZMemoryConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });

    // 响应拦截器，统一处理错误
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error || error.message || 'Unknown error';
        const status = error.response?.status;
        const code = error.response?.data?.code;
        throw new ZMemoryError(message, code, status);
      }
    );
  }

  /**
   * 添加新记忆
   */
  async addMemory(params: AddMemoryParams): Promise<Memory> {
    const response = await this.client.post('/api/memories', {
      type: params.type,
      content: params.content,
      tags: params.tags,
      metadata: params.metadata,
    });
    return response.data;
  }

  /**
   * 搜索记忆
   */
  async searchMemories(params: Partial<SearchMemoriesParams> = {}): Promise<Memory[]> {
    const searchParams = new URLSearchParams();
    
    if (params.type) searchParams.set('type', params.type);
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.offset) searchParams.set('offset', params.offset.toString());
    
    // 对于复杂搜索，我们可能需要发送POST请求到专门的搜索端点
    // 但目前使用现有的GET接口
    const response = await this.client.get(`/api/memories?${searchParams.toString()}`);
    let memories: Memory[] = response.data;

    // 客户端过滤（如果API不支持所有过滤选项）
    if (params.status || params.priority || params.category || params.tags || params.keyword) {
      memories = memories.filter(memory => {
        if (params.status && memory.content?.status !== params.status) return false;
        if (params.priority && memory.content?.priority !== params.priority) return false;
        if (params.category && memory.content?.category !== params.category) return false;
        
        if (params.tags && params.tags.length > 0) {
          const memoryTags = memory.tags || [];
          if (!params.tags.some(tag => memoryTags.includes(tag))) return false;
        }
        
        if (params.keyword) {
          const keyword = params.keyword.toLowerCase();
          const title = (memory.content?.title || '').toLowerCase();
          const description = (memory.content?.description || '').toLowerCase();
          if (!title.includes(keyword) && !description.includes(keyword)) return false;
        }
        
        return true;
      });
    }

    return memories;
  }

  /**
   * 获取特定记忆
   */
  async getMemory(id: string): Promise<Memory> {
    const response = await this.client.get(`/api/memories/${id}`);
    return response.data;
  }

  /**
   * 更新记忆
   */
  async updateMemory(params: UpdateMemoryParams): Promise<Memory> {
    const updateData: any = {};
    if (params.content !== undefined) updateData.content = params.content;
    if (params.tags !== undefined) updateData.tags = params.tags;
    if (params.metadata !== undefined) updateData.metadata = params.metadata;

    const response = await this.client.put(`/api/memories/${params.id}`, updateData);
    return response.data;
  }

  /**
   * 删除记忆
   */
  async deleteMemory(id: string): Promise<boolean> {
    await this.client.delete(`/api/memories/${id}`);
    return true;
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<MemoryStats> {
    try {
      // 尝试使用专门的统计端点
      const response = await this.client.get('/api/tasks/stats');
      return response.data || this.getDefaultStats();
    } catch (error) {
      try {
        // 如果没有统计端点，则基于所有记忆计算统计
        const memories = await this.searchMemories({ limit: 1000, offset: 0 });
        return this.calculateStats(memories);
      } catch (searchError) {
        // 如果搜索也失败，返回默认统计
        return this.getDefaultStats();
      }
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

  /**
   * 计算统计信息
   */
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
      // 按类型统计
      stats.by_type[memory.type] = (stats.by_type[memory.type] || 0) + 1;
      
      // 按状态统计
      const status = memory.content?.status || 'unknown';
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;
      
      // 按优先级统计
      const priority = memory.content?.priority || 'unknown';
      stats.by_priority[priority] = (stats.by_priority[priority] || 0) + 1;
      
      // 最近创建数量
      if (new Date(memory.created_at) > oneDayAgo) {
        stats.recent_count++;
      }
    });

    return stats;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }
}
