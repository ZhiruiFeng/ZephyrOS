import useSWR, { mutate } from 'swr';
import { apiClient, TaskMemory, CreateTaskRequest, UpdateTaskRequest } from '../lib/api';

// Hook to get memory list
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

// Hook to get single memory
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

// Hook to create memory
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

// Hook to update memory
export function useUpdateTask() {
  const updateTask = async (id: string, data: UpdateTaskRequest) => {
    try {
      console.log('useUpdateTask called with:', id, JSON.stringify(data, null, 2));
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

// Hook to delete memory
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
// Compatible export: if legacy code references useTasks, this implementation is the task data source