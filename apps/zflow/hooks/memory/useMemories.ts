import useSWR, { mutate } from 'swr';
import { apiClient, TaskMemory, CreateTaskRequest, UpdateTaskRequest } from '../../lib/api';
import { tasksConfig, taskDetailsConfig } from '../../lib/swr-config';

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
      const updatedTask = await apiClient.updateTask(id, data);
      // Update individual task cache
      await mutate(`task-${id}`, updatedTask, false);
      // Update all tasks queries
      await mutate((key) => typeof key === 'string' && key.startsWith('tasks'), undefined, { revalidate: true });
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  };

  // Silent update for auto-save that doesn't revalidate caches
  const updateTaskSilent = async (id: string, data: UpdateTaskRequest) => {
    try {
      const updatedTask = await apiClient.updateTask(id, data);
      // Update individual task cache without revalidation
      await mutate(`task-${id}`, updatedTask, false);
      // Update tasks list cache silently without revalidation
      await mutate((key) => typeof key === 'string' && key.startsWith('tasks'), (currentData) => {
        if (!Array.isArray(currentData)) return currentData;
        return currentData.map(task => {
          if (task.id === id) {
            // Preserve category information when updating
            return {
              ...updatedTask,
              category: task.category,
              category_id: task.category_id || task.content.category_id
            };
          }
          return task;
        });
      }, { revalidate: false });
      return updatedTask;
    } catch (error) {
      console.error('Failed to update task silently:', error);
      throw error;
    }
  };

  return { updateTask, updateTaskSilent };
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
      return { success: true };
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  return { deleteTask };
}
// Compatible export: if legacy code references useTasks, this implementation is the task data source