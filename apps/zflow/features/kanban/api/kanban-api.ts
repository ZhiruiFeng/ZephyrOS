// =====================================================
// Kanban Feature API
// =====================================================

import { apiClient } from '@/lib/api'
import type { TaskMemory, TaskContent } from '@/lib/api/api-base'
import type { KanbanTaskUpdate, KanbanStats } from '../types/kanban'

// =====================================================
// Kanban Task Operations
// =====================================================

export const kanbanApi = {
  /**
   * Get tasks for kanban view with filtering
   */
  async getKanbanTasks(params?: {
    root_tasks_only?: boolean
    status?: string
    category_id?: string
    priority?: string
    limit?: number
  }): Promise<{ tasks: TaskMemory[] }> {
    try {
      const tasks = await apiClient.getTasks(params || {})
      return { tasks: tasks as TaskMemory[] }
    } catch (error) {
      console.error('Failed to fetch kanban tasks:', error)
      throw error
    }
  },

  /**
   * Update task status (for drag and drop)
   */
  async updateTaskStatus(taskId: string, status: TaskContent['status']): Promise<TaskMemory> {
    try {
      // Get current task first
      const currentTask = await apiClient.getTask(taskId)
      const updatedContent = {
        ...currentTask.content,
        status
      }
      const updatedTask = await apiClient.updateTask(taskId, { content: updatedContent })
      return updatedTask as TaskMemory
    } catch (error) {
      console.error('Failed to update task status:', error)
      throw error
    }
  },

  /**
   * Update multiple task properties
   */
  async updateTask(taskId: string, updates: KanbanTaskUpdate): Promise<TaskMemory> {
    try {
      // Get current task first
      const currentTask = await apiClient.getTask(taskId)
      const updatedContent = {
        ...currentTask.content,
        ...updates
      }
      const updatedTask = await apiClient.updateTask(taskId, { 
        content: updatedContent,
        tags: updates.tags || currentTask.tags
      })
      return updatedTask as TaskMemory
    } catch (error) {
      console.error('Failed to update task:', error)
      throw error
    }
  },

  /**
   * Create a new task
   */
  async createTask(taskData: {
    title: string
    description?: string
    status?: TaskContent['status']
    priority?: TaskContent['priority']
    category_id?: string
    due_date?: string
    estimated_duration?: number
    tags?: string[]
  }): Promise<TaskMemory> {
    try {
      const createData = {
        type: 'task' as const,
        content: {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status || 'pending',
          priority: taskData.priority || 'medium',
          category_id: taskData.category_id,
          due_date: taskData.due_date,
          estimated_duration: taskData.estimated_duration
        },
        tags: taskData.tags || []
      }
      const newTask = await apiClient.createTask(createData)
      return newTask as TaskMemory
    } catch (error) {
      console.error('Failed to create task:', error)
      throw error
    }
  },

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await apiClient.deleteTask(taskId)
    } catch (error) {
      console.error('Failed to delete task:', error)
      throw error
    }
  },

  /**
   * Get kanban statistics
   */
  async getKanbanStats(): Promise<KanbanStats> {
    try {
      const tasks = await apiClient.getTasks({ root_tasks_only: true })
      
      const stats: KanbanStats = {
        totalTasks: tasks.length,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        averageProgress: 0
      }

      let totalProgress = 0

      tasks.forEach((task) => {
        const content = (task as TaskMemory).content as TaskContent
        
        switch (content.status) {
          case 'pending':
            stats.pendingTasks++
            break
          case 'in_progress':
            stats.inProgressTasks++
            break
          case 'completed':
            stats.completedTasks++
            break
        }

        totalProgress += content.progress || 0

        // Check if overdue
        if (content.due_date && content.status !== 'completed') {
          const dueDate = new Date(content.due_date)
          const now = new Date()
          if (dueDate < now) {
            stats.overdueTasks++
          }
        }
      })

      stats.averageProgress = tasks.length > 0 ? totalProgress / tasks.length : 0

      return stats
    } catch (error) {
      console.error('Failed to get kanban stats:', error)
      throw error
    }
  },

  /**
   * Bulk update task statuses (for batch operations)
   */
  async bulkUpdateTaskStatus(taskIds: string[], status: TaskContent['status']): Promise<TaskMemory[]> {
    try {
      const updatePromises = taskIds.map(async taskId => {
        const currentTask = await apiClient.getTask(taskId)
        const updatedContent = {
          ...currentTask.content,
          status
        }
        return apiClient.updateTask(taskId, { content: updatedContent })
      })
      
      const updatedTasks = await Promise.all(updatePromises)
      return updatedTasks as TaskMemory[]
    } catch (error) {
      console.error('Failed to bulk update task statuses:', error)
      throw error
    }
  }
}
