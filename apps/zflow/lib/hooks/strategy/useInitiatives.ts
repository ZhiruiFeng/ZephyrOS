import useSWR from 'swr'
import { authJsonFetcher } from '../../utils/auth-fetcher'
import { adaptTasksToInitiatives, adaptTaskToInitiative } from '../../adapters/strategy'
import type { UseInitiativesReturn, CreateInitiativeForm } from '../../types/strategy'
import type { Task } from '../../../app/types/task'

const ZMEMORY_API_BASE = 'http://localhost:3001/api'

export function useInitiatives(seasonId?: string): UseInitiativesReturn {
  // Fetch tasks that represent initiatives
  const { data: tasks, error, mutate } = useSWR<Task[]>(
    `${ZMEMORY_API_BASE}/tasks?tags=initiative,strategic&limit=50`,
    authJsonFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 15000, // 15 seconds
      onError: (error) => {
        console.error('Error fetching initiative tasks:', error)
      }
    }
  )

  // Also fetch all tasks for computing initiative progress
  const { data: allTasks } = useSWR<Task[]>(
    `${ZMEMORY_API_BASE}/tasks?limit=200`,
    authJsonFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  )

  const initiatives = tasks && allTasks
    ? adaptTasksToInitiatives(tasks).map(init => {
        // Enhance with related tasks from all tasks
        const relatedTasks = allTasks.filter(task =>
          task.category_id === tasks.find(t => t.id === init.id)?.category_id ||
          task.tags?.some(tag => init.tags.includes(tag))
        )
        return {
          ...init,
          tasks: relatedTasks.map(t => ({ ...t, initiativeId: init.id, initiativeTitle: init.title }))
        }
      })
    : []

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

      const response = await fetch(`${ZMEMORY_API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      if (!response.ok) {
        throw new Error('Failed to create initiative')
      }

      const newTask = await response.json()
      const newInitiative = adaptTaskToInitiative(newTask, allTasks || [])

      // Optimistically update the cache
      await mutate()

      return newInitiative
    } catch (error) {
      console.error('Error creating initiative:', error)
      throw error
    }
  }

  const updateInitiative = async (id: string, updateData: Partial<any>) => {
    try {
      const response = await fetch(`${ZMEMORY_API_BASE}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
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
      const updatedInitiative = adaptTaskToInitiative(updatedTask, allTasks || [])

      // Optimistically update the cache
      await mutate()

      return updatedInitiative
    } catch (error) {
      console.error('Error updating initiative:', error)
      throw error
    }
  }

  const deleteInitiative = async (id: string) => {
    try {
      const response = await fetch(`${ZMEMORY_API_BASE}/tasks/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete initiative')
      }

      // Optimistically update the cache
      await mutate()
    } catch (error) {
      console.error('Error deleting initiative:', error)
      throw error
    }
  }

  return {
    initiatives: seasonId
      ? initiatives.filter(init => init.seasonId === seasonId)
      : initiatives,
    loading: !tasks && !error,
    error: error?.message || null,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    refetch: () => mutate()
  }
}