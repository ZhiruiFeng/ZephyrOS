import { useState, useEffect } from 'react';
import { Task, TaskParams } from '../types/Task';
import { apiClient } from '../services/api';

export function useTasks(params?: TaskParams) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.getTasks(params);
      
      if (response.success && response.data) {
        setTasks(response.data);
      } else {
        setError(response.error || '获取任务列表失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    await fetchTasks();
  };

  const createTask = async (taskData: any) => {
    try {
      const response = await apiClient.createTask(taskData);
      
      if (response.success && response.data) {
        setTasks(prev => [response.data!, ...prev]);
        return response.data;
      } else {
        throw new Error(response.error || '创建任务失败');
      }
    } catch (err) {
      throw err;
    }
  };

  const updateTask = async (id: string, taskData: any) => {
    try {
      const response = await apiClient.updateTask(id, taskData);
      
      if (response.success && response.data) {
        setTasks(prev => 
          prev.map(task => 
            task.id === id ? response.data! : task
          )
        );
        return response.data;
      } else {
        throw new Error(response.error || '更新任务失败');
      }
    } catch (err) {
      throw err;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const response = await apiClient.deleteTask(id);
      
      if (response.success) {
        setTasks(prev => prev.filter(task => task.id !== id));
      } else {
        throw new Error(response.error || '删除任务失败');
      }
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    isLoading,
    error,
    refetch,
    createTask,
    updateTask,
    deleteTask,
  };
}
