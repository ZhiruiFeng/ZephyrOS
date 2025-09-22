import useSWR from 'swr'
import { authJsonFetcher } from '../../utils/auth-fetcher'
import { adaptTasksToInitiatives, adaptTaskToInitiative } from '../../adapters/strategy'
import { ZMEMORY_API_BASE } from '../../api/zmemory-api-base'
import { authManager } from '../../auth-manager'
import type { UseInitiativesReturn, CreateInitiativeForm } from '../../types/strategy'
import type { Task } from '../../../app/types/task'

export function useInitiatives(seasonId?: string): UseInitiativesReturn {
  // TODO: Temporarily use mock data until API endpoints are set up
  const mockTasks: Task[] = [
    {
      id: 'init-1',
      user_id: 'mock-user',
      title: 'Implement Strategic Planning System',
      description: 'Build comprehensive strategy dashboard and planning tools',
      status: 'in_progress',
      priority: 'high',
      progress: 65,
      category: { 
        id: 'cat-1', 
        name: 'Strategic Projects',
        color: '#3b82f6',
        created_at: '2024-09-01T00:00:00Z',
        updated_at: '2024-09-20T00:00:00Z'
      },
      tags: ['initiative', 'strategic', 'system'],
      created_at: '2024-09-01T00:00:00Z',
      updated_at: '2024-09-19T00:00:00Z',
      due_date: '2024-12-31'
    },
    {
      id: 'init-2',
      user_id: 'mock-user',
      title: 'Optimize Workflow Efficiency',
      description: 'Streamline task management and automation processes',
      status: 'in_progress',
      priority: 'high',
      progress: 40,
      category: { 
        id: 'cat-2', 
        name: 'Process Improvement',
        color: '#10b981',
        created_at: '2024-09-05T00:00:00Z',
        updated_at: '2024-09-18T00:00:00Z'
      },
      tags: ['initiative', 'strategic', 'workflow'],
      created_at: '2024-09-05T00:00:00Z',
      updated_at: '2024-09-20T00:00:00Z',
      due_date: '2024-11-30'
    }
  ]

  const mockAllTasks: Task[] = [
    ...mockTasks,
    {
      id: 'task-1',
      user_id: 'mock-user',
      title: 'Design strategy dashboard UI',
      description: 'Create mockups and wireframes',
      status: 'completed',
      priority: 'medium',
      progress: 100,
      category: { 
        id: 'cat-1', 
        name: 'Strategic Projects',
        color: '#3b82f6',
        created_at: '2024-09-01T00:00:00Z',
        updated_at: '2024-09-20T00:00:00Z'
      },
      tags: ['design', 'ui'],
      created_at: '2024-09-01T00:00:00Z',
      updated_at: '2024-09-10T00:00:00Z'
    },
    {
      id: 'task-2',
      user_id: 'mock-user',
      title: 'Implement data hooks',
      description: 'Create strategy data fetching hooks',
      status: 'in_progress',
      priority: 'high',
      progress: 80,
      category: { 
        id: 'cat-1', 
        name: 'Strategic Projects',
        color: '#3b82f6',
        created_at: '2024-09-01T00:00:00Z',
        updated_at: '2024-09-20T00:00:00Z'
      },
      tags: ['development', 'hooks'],
      created_at: '2024-09-05T00:00:00Z',
      updated_at: '2024-09-19T00:00:00Z'
    }
  ]

  const initiatives = adaptTasksToInitiatives(mockTasks).map(init => {
    // Enhance with related tasks from all tasks
    const relatedTasks = mockAllTasks.filter(task =>
      task.category?.id === mockTasks.find(t => t.id === init.id)?.category?.id ||
      task.tags?.some(tag => init.tags.includes(tag))
    )
    return {
      ...init,
      tasks: relatedTasks.map(t => ({ ...t, initiativeId: init.id, initiativeTitle: init.title }))
    }
  })

  const createInitiative = async (data: CreateInitiativeForm) => {
    try {
      const taskData = {
        type: 'task',
        content: {
          title: data.title,
          description: data.description,
          status: 'pending',
          priority: data.priority,
          category: 'Initiative', // Special category for initiatives
          due_date: data.due_date,
          progress: 0
        },
        tags: ['initiative', 'strategic', ...data.tags],
        metadata: {
          seasonId: data.seasonId
        }
      }

      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        throw new Error('Failed to create initiative')
      }

      const newTask = await response.json()
      const newInitiative = adaptTaskToInitiative(newTask, mockAllTasks || [])

      // TODO: Update cache when real API is implemented
      // await mutate()

      return newInitiative
    } catch (error) {
      console.error('Error creating initiative:', error)
      throw error
    }
  }

  const updateInitiative = async (id: string, updateData: Partial<any>) => {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_API_BASE}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          content: updateData,
          tags: updateData.tags
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update initiative')
      }

      const updatedTask = await response.json()
      const updatedInitiative = adaptTaskToInitiative(updatedTask, mockAllTasks || [])

      // TODO: Update cache when real API is implemented
      // await mutate()

      return updatedInitiative
    } catch (error) {
      console.error('Error updating initiative:', error)
      throw error
    }
  }

  const deleteInitiative = async (id: string) => {
    try {
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZMEMORY_API_BASE}/tasks/${id}`, {
        method: 'DELETE',
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error('Failed to delete initiative')
      }

      // TODO: Update cache when real API is implemented
      // await mutate()
    } catch (error) {
      console.error('Error deleting initiative:', error)
      throw error
    }
  }

  return {
    initiatives: seasonId
      ? initiatives.filter(init => init.seasonId === seasonId)
      : initiatives,
    loading: false, // Mock data is immediately available
    error: null,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    refetch: () => Promise.resolve()
  }
}
