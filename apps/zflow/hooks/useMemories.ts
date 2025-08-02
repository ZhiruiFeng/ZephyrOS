import useSWR, { mutate } from 'swr';
import { apiClient, Memory, CreateMemoryRequest, UpdateMemoryRequest } from '../lib/api';

// 获取记忆列表的 hook
export function useMemories(params?: {
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const key = params ? `memories-${JSON.stringify(params)}` : 'memories';
  
  const { data, error, isLoading, mutate: refetch } = useSWR(
    key,
    () => apiClient.getMemories(params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    memories: data || [],
    isLoading,
    error,
    refetch,
  };
}

// 获取单个记忆的 hook
export function useMemory(id: string) {
  const { data, error, isLoading, mutate: refetch } = useSWR(
    id ? `memory-${id}` : null,
    () => apiClient.getMemory(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    memory: data,
    isLoading,
    error,
    refetch,
  };
}

// 创建记忆的 hook
export function useCreateMemory() {
  const createMemory = async (data: CreateMemoryRequest) => {
    try {
      const newMemory = await apiClient.createMemory(data);
      
      // 更新缓存
      await mutate('memories');
      
      return newMemory;
    } catch (error) {
      console.error('Failed to create memory:', error);
      throw error;
    }
  };

  return { createMemory };
}

// 更新记忆的 hook
export function useUpdateMemory() {
  const updateMemory = async (id: string, data: UpdateMemoryRequest) => {
    try {
      const updatedMemory = await apiClient.updateMemory(id, data);
      
      // 更新缓存
      await mutate(`memory-${id}`, updatedMemory, false);
      await mutate('memories');
      
      return updatedMemory;
    } catch (error) {
      console.error('Failed to update memory:', error);
      throw error;
    }
  };

  return { updateMemory };
}

// 删除记忆的 hook
export function useDeleteMemory() {
  const deleteMemory = async (id: string) => {
    try {
      await apiClient.deleteMemory(id);
      
      // 更新缓存
      await mutate('memories');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to delete memory:', error);
      throw error;
    }
  };

  return { deleteMemory };
}

// 获取任务列表的 hook（便捷方法）
export function useTasks() {
  return useMemories({ type: 'task' });
}

// 获取笔记列表的 hook（便捷方法）
export function useNotes() {
  return useMemories({ type: 'note' });
} 