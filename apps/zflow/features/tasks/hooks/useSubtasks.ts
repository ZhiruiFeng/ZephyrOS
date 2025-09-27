import { useState, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { subtasksApi, TaskMemory } from '@/lib/api'
import { Task } from 'types'

export interface SubtaskTreeData {
  task: TaskMemory;
  subtasks?: TaskMemory[];
  tree_stats: {
    total_subtasks: number;
    completed_subtasks: number;
    pending_subtasks: number;
    in_progress_subtasks: number;
    completion_percentage: number;
    max_depth: number;
  };
}

export function useSubtasks(taskId: string | null, params?: {
  max_depth?: number;
  include_completed?: boolean;
  format?: 'flat' | 'nested';
}) {
  const { data, error, isLoading, mutate: swrMutate } = useSWR(
    taskId ? [`/api/tasks/${taskId}/tree`, params] : null,
    ([url, p]) => subtasksApi.getTaskTree(taskId!, p),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // 添加重新验证选项以确保数据及时更新
      revalidateIfStale: true,
      revalidateOnMount: true,
    }
  )

  const refresh = useCallback(() => {
    if (taskId) {
      // 强制重新验证数据
      swrMutate(undefined, { revalidate: true })
    }
  }, [taskId, swrMutate])

  return {
    data: data as SubtaskTreeData | undefined,
    error,
    isLoading,
    refresh
  }
}

export function useSubtaskActions() {
  const [isCreating, setIsCreating] = useState(false)
  const [isReordering, setIsReordering] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const createSubtask = useCallback(async (
    parentTaskId: string,
    subtask: Parameters<typeof subtasksApi.create>[1]
  ) => {
    setIsCreating(true)
    try {
      const result = await subtasksApi.create(parentTaskId, subtask)
      
      // Refresh the task tree
      await mutate([`/api/tasks/${parentTaskId}/tree`, undefined])
      // Also refresh any other task lists that might include this task
      await mutate((key) => Array.isArray(key) && key[0] === '/api/tasks')
      
      return result
    } finally {
      setIsCreating(false)
    }
  }, [])

  const updateSubtask = useCallback(async (
    subtaskId: string,
    updates: {
      title?: string;
      description?: string;
      status?: Task['status'];
      priority?: Task['priority'];
      category_id?: string;
      due_date?: string;
      estimated_duration?: number;
      progress?: number;
      assignee?: string;
      notes?: string;
      tags?: string[];
    }
  ) => {
    setIsUpdating(true)
    try {
      const result = await subtasksApi.update(subtaskId, updates)
      
      // Refresh all task trees that might contain this subtask
      await mutate((key) => {
        if (Array.isArray(key) && key[0] === '/api/tasks') {
          // Refresh task tree endpoints
          if (key[0].includes('/tree')) {
            return true
          }
          // Refresh individual task endpoints
          if (key[0].includes(`/api/tasks/${subtaskId}`)) {
            return true
          }
        }
        return false
      })
      
      // Also refresh any other task lists
      await mutate((key) => Array.isArray(key) && key[0] === '/api/tasks' && !key[0].includes('/tree'))
      
      return result
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const deleteSubtask = useCallback(async (subtaskId: string) => {
    setIsDeleting(true)
    try {
      const result = await subtasksApi.delete(subtaskId)
      
      // Refresh all task trees that might contain this subtask
      await mutate((key) => {
        if (Array.isArray(key) && key[0] === '/api/tasks') {
          // Refresh task tree endpoints
          if (key[0].includes('/tree')) {
            return true
          }
          // Refresh individual task endpoints
          if (key[0].includes(`/api/tasks/${subtaskId}`)) {
            return true
          }
        }
        return false
      })
      
      // Also refresh any other task lists
      await mutate((key) => Array.isArray(key) && key[0] === '/api/tasks' && !key[0].includes('/tree'))
      
      return result
    } finally {
      setIsDeleting(false)
    }
  }, [])

  const reorderSubtasks = useCallback(async (
    parentTaskId: string,
    subtaskOrders: Array<{ task_id: string; new_order: number }>
  ) => {
    setIsReordering(true)
    try {
      const result = await subtasksApi.reorder(parentTaskId, subtaskOrders)
      
      // Refresh the task tree
      await mutate([`/api/tasks/${parentTaskId}/tree`, undefined])
      
      return result
    } finally {
      setIsReordering(false)
    }
  }, [])

  return {
    createSubtask,
    updateSubtask,
    deleteSubtask,
    reorderSubtasks,
    isCreating,
    isUpdating,
    isDeleting,
    isReordering
  }
}