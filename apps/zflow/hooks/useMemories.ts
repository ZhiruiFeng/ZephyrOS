import useSWR, { mutate } from 'swr';
import { apiClient, TaskMemory, CreateTaskRequest, UpdateTaskRequest } from '../lib/api';
import { tasksConfig, taskDetailsConfig } from '../lib/swr-config';

// Hook to get memory list
export function useTasks(params?: Parameters<typeof apiClient.getTasks>[0] | null) {
  const key = params === null ? null : (params ? `tasks-${JSON.stringify(params)}` : 'tasks');

  const { data, error, isLoading, mutate: refetch } = useSWR(
    key,
    () => params !== null ? apiClient.getTasks(params) : null,
    tasksConfig
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
    taskDetailsConfig
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
      // Optimistically update all tasks queries
      await mutate((key) => typeof key === 'string' && key.startsWith('tasks'), undefined, { revalidate: true });
      console.log('✨ Task created and caches updated');
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
      // Update individual task cache
      await mutate(`task-${id}`, updatedTask, false);
      // Update all tasks queries
      await mutate((key) => typeof key === 'string' && key.startsWith('tasks'), undefined, { revalidate: true });
      console.log('🔄 Task updated and caches refreshed');
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
      // Remove from individual cache
      await mutate(`task-${id}`, undefined, false);
      // Update all tasks queries
      await mutate((key) => typeof key === 'string' && key.startsWith('tasks'), undefined, { revalidate: true });
      console.log('🗑️ Task deleted and caches updated');
      return { success: true };
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  return { deleteTask };
}
// Compatible export: if legacy code references useTasks, this implementation is the task data source