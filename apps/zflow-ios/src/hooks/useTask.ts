import { useState, useEffect } from 'react';
import { Task, UpdateTaskRequest } from '../types/Task';
import { apiClient } from '../services/api';

export function useTask(taskId: string) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = async () => {
    if (!taskId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.getTask(taskId);
      
      if (response.success && response.data) {
        setTask(response.data);
      } else {
        setError(response.error || '获取任务详情失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (taskData: UpdateTaskRequest) => {
    if (!taskId) return;

    try {
      const response = await apiClient.updateTask(taskId, taskData);
      
      if (response.success && response.data) {
        setTask(response.data);
        return response.data;
      } else {
        throw new Error(response.error || '更新任务失败');
      }
    } catch (err) {
      throw err;
    }
  };

  const updateTaskStatus = async (status: string, notes?: string, progress?: number) => {
    if (!taskId) return;

    try {
      const response = await apiClient.updateTaskStatus(taskId, status, notes, progress);
      
      if (response.success && response.data) {
        setTask(response.data);
        return response.data;
      } else {
        throw new Error(response.error || '更新任务状态失败');
      }
    } catch (err) {
      throw err;
    }
  };

  const deleteTask = async () => {
    if (!taskId) return;

    try {
      const response = await apiClient.deleteTask(taskId);
      
      if (response.success) {
        setTask(null);
      } else {
        throw new Error(response.error || '删除任务失败');
      }
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  return {
    task,
    isLoading,
    error,
    refetch: fetchTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
  };
}
