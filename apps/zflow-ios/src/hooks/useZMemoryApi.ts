import { useState, useEffect, useCallback, useMemo } from 'react';
import { zmemoryApi } from '../lib/api';
import { TaskMemory, CreateTaskRequest, Category } from '../types/task';

// Generic hook for API calls with loading and error states
function useApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  immediate: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('API call failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  return { data, loading, error, refetch, execute };
}

// Hook for fetching tasks
export function useTasks(params?: Parameters<typeof zmemoryApi.getTasks>[0]) {
  const [data, setData] = useState<TaskMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a stable string key for the params
  const paramsKey = useMemo(() => JSON.stringify(params), [JSON.stringify(params)]);

  useEffect(() => {
    if (!params) {
      setData([]);
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await zmemoryApi.getTasks(params);
        if (!isCancelled) {
          setData(result);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          console.error('Failed to fetch tasks:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [paramsKey]);

  const refetch = useCallback(async () => {
    if (!params) return;

    setLoading(true);
    setError(null);
    try {
      const result = await zmemoryApi.getTasks(params);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Failed to refetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  return {
    tasks: data,
    loading,
    error,
    refetch,
  };
}

// Hook for fetching a single task
export function useTask(id: string | null) {
  const apiCall = useCallback(() => {
    if (!id) throw new Error('Task ID is required');
    return zmemoryApi.getTask(id);
  }, [id]);

  const { data, loading, error, refetch } = useApiCall(
    apiCall,
    [id],
    Boolean(id) // Only fetch if ID is provided
  );

  return {
    task: data,
    loading,
    error,
    refetch,
  };
}

// Hook for creating tasks
export function useCreateTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = useCallback(async (taskData: CreateTaskRequest) => {
    try {
      setLoading(true);
      setError(null);
      const result = await zmemoryApi.createTask(taskData);
      console.log('✅ Task created successfully:', result.id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      console.error('❌ Failed to create task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTask, loading, error };
}

// Hook for updating tasks
export function useUpdateTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTask = useCallback(async (id: string, updates: Partial<CreateTaskRequest>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await zmemoryApi.updateTask(id, updates);
      console.log('✅ Task updated successfully:', result.id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      console.error('❌ Failed to update task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateTask, loading, error };
}

// Hook for deleting tasks
export function useDeleteTask() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteTask = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await zmemoryApi.deleteTask(id);
      console.log('✅ Task deleted successfully:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
      console.error('❌ Failed to delete task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteTask, loading, error };
}

// Hook for fetching categories
export function useCategories() {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await zmemoryApi.getCategories();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(errorMessage);
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const refetch = useCallback(() => {
    return fetchCategories();
  }, [fetchCategories]);

  return {
    categories: data,
    loading,
    error,
    refetch,
  };
}

// Hook for creating categories
export function useCreateCategory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCategory = useCallback(async (categoryData: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await zmemoryApi.createCategory(categoryData);
      console.log('✅ Category created successfully:', result.id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category';
      setError(errorMessage);
      console.error('❌ Failed to create category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createCategory, loading, error };
}

// Hook for updating categories
export function useUpdateCategory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await zmemoryApi.updateCategory(id, updates);
      console.log('✅ Category updated successfully:', result.id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category';
      setError(errorMessage);
      console.error('❌ Failed to update category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateCategory, loading, error };
}

// Hook for deleting categories
export function useDeleteCategory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await zmemoryApi.deleteCategory(id);
      console.log('✅ Category deleted successfully:', id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      setError(errorMessage);
      console.error('❌ Failed to delete category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteCategory, loading, error };
}

// Hook for timer operations
export function useTaskTimer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTimer = useCallback(async (taskId: string, options?: { autoSwitch?: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await zmemoryApi.startTimer(taskId, options);
      console.log('⏱️ Timer started for task:', taskId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start timer';
      setError(errorMessage);
      console.error('❌ Failed to start timer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const stopTimer = useCallback(async (taskId: string, options?: { overrideEndAt?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const result = await zmemoryApi.stopTimer(taskId, options);
      console.log('⏱️ Timer stopped for task:', taskId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop timer';
      setError(errorMessage);
      console.error('❌ Failed to stop timer:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { startTimer, stopTimer, loading, error };
}

// Hook for task time entries
export function useTaskTimeEntries(taskId: string | null) {
  const apiCall = useCallback(() => {
    if (!taskId) throw new Error('Task ID is required');
    return zmemoryApi.getTaskTimeEntries(taskId);
  }, [taskId]);

  const { data, loading, error, refetch } = useApiCall(
    apiCall,
    [taskId],
    Boolean(taskId)
  );

  return {
    timeEntries: data || [],
    loading,
    error,
    refetch,
  };
}