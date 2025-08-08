import useSWR, { mutate } from 'swr';
import { apiClient, TaskMemory, CreateTaskRequest, UpdateTaskRequest } from '../lib/api';

// 获取记忆列表的 hook
export function useTasks(params?: Parameters<typeof apiClient.getTasks>[0]) {
  const key = params ? `tasks-${JSON.stringify(params)}` : 'tasks';

  const { data, error, isLoading, mutate: refetch } = useSWR(
    key,
    () => apiClient.getTasks(params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    tasks: (data as TaskMemory[]) || [],
    isLoading,
    error,
    refetch,
  };
}

// 获取单个记忆的 hook
export function useTask(id: string) {
  const { data, error, isLoading, mutate: refetch } = useSWR(
    id ? `task-${id}` : null,
    () => apiClient.getTask(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    task: data as TaskMemory | undefined,
    isLoading,
    error,
    refetch,
  };
}

// 创建记忆的 hook
export function useCreateTask() {
  const createTask = async (data: CreateTaskRequest) => {
    try {
      const newTask = await apiClient.createTask(data);
      await mutate((key) => typeof key === 'string' && key.startsWith('tasks'));
      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  return { createTask };
}

// 更新记忆的 hook
export function useUpdateTask() {
  const updateTask = async (id: string, data: UpdateTaskRequest) => {
    try {
      const updatedTask = await apiClient.updateTask(id, data);
      await mutate(`task-${id}`, updatedTask, false);
      await mutate((key) => typeof key === 'string' && key.startsWith('tasks'));
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };

  return { updateTask };
}

// 删除记忆的 hook
export function useDeleteTask() {
  const deleteTask = async (id: string) => {
    try {
      await apiClient.deleteTask(id);
      await mutate((key) => typeof key === 'string' && key.startsWith('tasks'));
      return { success: true };
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  return { deleteTask };
}
// 兼容导出：若有旧代码引用 useTasks，此实现即为任务数据源