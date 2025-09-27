'use client'

import { useCallback } from 'react'
import { TaskMemory, TaskContent } from '@/lib/api'
import { useUpdateTask } from '@/features/tasks/hooks'
import { useTranslation } from '@/contexts/LanguageContext'

/**
 * Generic task operations hook for basic CRUD operations
 * Features can extend this for their specific needs
 */
export function useTaskOperations() {
  const { t } = useTranslation()
  const { updateTask, updateTaskSilent } = useUpdateTask()

  // Save task changes
  const saveTask = useCallback(async (taskId: string, data: any) => {
    await updateTask(taskId, data)
  }, [updateTask])

  // Save task silently (for auto-save scenarios)
  const saveTaskSilent = useCallback(async (taskId: string, data: any) => {
    await updateTaskSilent(taskId, data)
  }, [updateTaskSilent])

  // Update task notes
  const updateNotes = useCallback(async (taskId: string, notes: string) => {
    return await updateTask(taskId, {
      content: { notes }
    })
  }, [updateTask])

  // Update task notes silently
  const updateNotesSilent = useCallback(async (taskId: string, notes: string) => {
    return await updateTaskSilent(taskId, {
      content: { notes }
    })
  }, [updateTaskSilent])

  // Update task status
  const updateStatus = useCallback(async (taskId: string, status: string) => {
    const now = new Date().toISOString()
    const updateData: any = {
      content: {
        status,
        ...(status === 'completed' ? { completion_date: now, progress: 100 } : {})
      }
    }

    return await updateTask(taskId, updateData)
  }, [updateTask])

  // Toggle task completion
  const toggleComplete = useCallback(async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    return await updateStatus(taskId, newStatus)
  }, [updateStatus])

  // Update task priority
  const updatePriority = useCallback(async (taskId: string, priority: string) => {
    return await updateTask(taskId, {
      content: { priority: priority as any }
    })
  }, [updateTask])

  // Update task progress
  const updateProgress = useCallback(async (taskId: string, progress: number) => {
    return await updateTask(taskId, {
      content: { progress }
    })
  }, [updateTask])

  // Convert TaskMemory to editable format
  const convertTaskForEdit = useCallback((task: TaskMemory) => {
    const taskContent = task.content as TaskContent
    return {
      id: task.id,
      title: taskContent.title,
      description: taskContent.description,
      status: taskContent.status,
      priority: taskContent.priority,
      category_id: (task as any).category_id || taskContent.category_id,
      created_at: task.created_at,
      updated_at: task.updated_at,
      due_date: taskContent.due_date,
      estimated_duration: taskContent.estimated_duration,
      progress: taskContent.progress || 0,
      assignee: taskContent.assignee,
      completion_date: taskContent.completion_date,
      notes: taskContent.notes,
      tags: task.tags
    }
  }, [])

  return {
    saveTask,
    saveTaskSilent,
    updateNotes,
    updateNotesSilent,
    updateStatus,
    toggleComplete,
    updatePriority,
    updateProgress,
    convertTaskForEdit
  }
}