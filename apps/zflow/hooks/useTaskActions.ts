import { useCallback } from 'react'
import { TaskMemory, TaskContent } from '../lib/api'
import { useCreateTask, useUpdateTask, useDeleteTask } from './useMemories'

interface UseTaskActionsProps {
  t: any // translations
}

export function useTaskActions({ t }: UseTaskActionsProps) {
  const { createTask } = useCreateTask()
  const { updateTask } = useUpdateTask()
  const { deleteTask } = useDeleteTask()

  // Add new task
  const handleAddTask = useCallback(async (taskData: any) => {
    try {
      const newTask = await createTask(taskData)
      return newTask
    } catch (error) {
      console.error('Failed to create task:', error)
      throw error
    }
  }, [createTask])

  // Edit existing task
  const handleEditTask = useCallback((task: TaskMemory) => {
    // Convert TaskMemory to Task format for TaskEditor
    const taskContent = task.content as TaskContent
    const convertedTask = {
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
    return convertedTask
  }, [])

  // Save task changes
  const handleSaveTask = useCallback(async (taskId: string, data: any) => {
    await updateTask(taskId, data)
  }, [updateTask])

  // Update task category
  const handleUpdateCategory = useCallback(async (taskId: string, categoryId: string | undefined) => {
    await updateTask(taskId, { content: { category_id: categoryId } })
  }, [updateTask])

  // Toggle task completion
  const toggleComplete = useCallback(async (id: string, current: string) => {
    const newStatus = current === 'completed' ? 'pending' : 'completed'
    const now = new Date().toISOString()
    await updateTask(id, { 
      content: { 
        status: newStatus,
        completion_date: newStatus === 'completed' ? now : undefined
      } 
    })
  }, [updateTask])

  // Put task on hold
  const holdTask = useCallback(async (id: string) => {
    await updateTask(id, { 
      content: { 
        status: 'on_hold'
      } 
    })
  }, [updateTask])

  // Activate task
  const activate = useCallback(async (id: string) => {
    await updateTask(id, { content: { status: 'pending' } })
  }, [updateTask])

  // Reopen task
  const reopen = useCallback(async (id: string) => {
    await updateTask(id, { content: { status: 'pending', progress: 0 } })
  }, [updateTask])

  // Delete task
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!confirm(t.messages?.confirmDelete || 'Are you sure you want to delete this task?')) return

    try {
      await deleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert(t.messages?.taskDeleteFailed || 'Failed to delete task')
    }
  }, [deleteTask, t])

  // Open task editor format converter
  const openEditor = useCallback((taskMemory: any) => {
    // Convert TaskMemory to Task format expected by TaskEditor
    const task = {
      id: taskMemory.id,
      ...taskMemory.content,
      tags: taskMemory.tags,
      created_at: taskMemory.created_at,
      updated_at: taskMemory.updated_at,
      // Add category_id from the top level if available
      category_id: (taskMemory as any).category_id || taskMemory.content.category_id,
    }
    return task
  }, [])

  return {
    handleAddTask,
    handleEditTask,
    handleSaveTask,
    handleUpdateCategory,
    toggleComplete,
    holdTask,
    activate,
    reopen,
    handleDeleteTask,
    openEditor
  }
}
