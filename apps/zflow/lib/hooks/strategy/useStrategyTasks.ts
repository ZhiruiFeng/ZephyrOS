import useSWR from 'swr'
import { authJsonFetcher } from '../../utils/auth-fetcher'
import { adaptTaskToStrategy } from '../../adapters/strategy'
import { ZMEMORY_API_BASE } from '../../api/zmemory-api-base'
import { authManager } from '../../auth-manager'
import type { UseStrategyTasksReturn } from '../../types/strategy'
import type { Task } from '../../../app/types/task'

export function useStrategyTasks(seasonId?: string): UseStrategyTasksReturn {
  // TODO: Temporarily use mock data until API endpoints are set up
  const mockTasks: Task[] = [
    {
      id: 'task-3',
      user_id: 'mock-user',
      title: 'Review quarterly metrics',
      description: 'Analyze Q3 performance data',
      status: 'pending',
      priority: 'medium',
      progress: 0,
      category: { 
        id: 'cat-3', 
        name: 'Analysis',
        color: '#f59e0b',
        created_at: '2024-09-10T00:00:00Z',
        updated_at: '2024-09-15T00:00:00Z'
      },
      tags: ['review', 'metrics'],
      assignee: 'me',
      created_at: '2024-09-20T00:00:00Z',
      updated_at: '2024-09-20T00:00:00Z',
      due_date: '2024-09-25'
    },
    {
      id: 'task-4',
      user_id: 'mock-user',
      title: 'Optimize database queries',
      description: 'Improve performance of task fetching',
      status: 'in_progress',
      priority: 'high',
      progress: 30,
      category: { 
        id: 'cat-4', 
        name: 'Development',
        color: '#8b5cf6',
        created_at: '2024-09-12T00:00:00Z',
        updated_at: '2024-09-16T00:00:00Z'
      },
      tags: ['optimization', 'backend'],
      assignee: 'claude-dev',
      created_at: '2024-09-18T00:00:00Z',
      updated_at: '2024-09-21T00:00:00Z',
      due_date: '2024-09-30'
    },
    {
      id: 'task-5',
      user_id: 'mock-user',
      title: 'Write strategy documentation',
      description: 'Document the strategic planning process',
      status: 'completed',
      priority: 'medium',
      progress: 100,
      category: { 
        id: 'cat-5', 
        name: 'Documentation',
        color: '#ef4444',
        created_at: '2024-09-14T00:00:00Z',
        updated_at: '2024-09-17T00:00:00Z'
      },
      tags: ['docs', 'strategy'],
      assignee: 'me',
      created_at: '2024-09-15T00:00:00Z',
      updated_at: '2024-09-19T00:00:00Z',
      completion_date: '2024-09-19T00:00:00Z'
    }
  ]

  // Filter and categorize tasks
  const allStrategyTasks = mockTasks.map(adaptTaskToStrategy)

  // Filter out initiative tasks (they're shown separately)
  const nonInitiativeTasks = allStrategyTasks.filter(task =>
    !task.tags?.includes('initiative')
  )

  const myTasks = nonInitiativeTasks.filter(task =>
    !task.assignee || task.assignee === 'me'
  )

  const agentTasks = nonInitiativeTasks.filter(task =>
    task.assignee && task.assignee !== 'me'
  )

  const createTask = async (data: any) => {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const newTask = await response.json()
      const strategyTask = adaptTaskToStrategy(newTask)

      // TODO: Update cache when real API is implemented
      // await mutate()

      return strategyTask
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  const updateTask = async (id: string, updateData: Partial<any>) => {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_API_BASE}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const updatedTask = await response.json()
      const strategyTask = adaptTaskToStrategy(updatedTask)

      // TODO: Update cache when real API is implemented
      // await mutate()

      return strategyTask
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  const delegateTask = async (taskId: string, agentId: string, briefing: string) => {
    try {
      // Update the task to assign it to the agent
      const updatedTask = await updateTask(taskId, {
        content: {
          assignee: agentId,
          notes: briefing
        }
      })

      // Optionally send a brief to the agent (this would be a separate API call)
      try {
        const authHeaders = await authManager.getAuthHeaders()
        await fetch(`${ZMEMORY_API_BASE}/agents/${agentId}/brief`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            content: briefing,
            taskId: taskId
          })
        })
      } catch (briefError) {
        console.warn('Failed to send brief to agent, but task was assigned:', briefError)
      }

      return updatedTask
    } catch (error) {
      console.error('Error delegating task:', error)
      throw error
    }
  }

  return {
    myTasks: seasonId
      ? myTasks.filter(task => (task as any).seasonId === seasonId)
      : myTasks,
    agentTasks: seasonId
      ? agentTasks.filter(task => (task as any).seasonId === seasonId)
      : agentTasks,
    loading: false, // Mock data is immediately available
    error: null,
    createTask,
    updateTask,
    delegateTask,
    refetch: () => Promise.resolve()
  }
}
