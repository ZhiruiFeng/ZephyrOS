import useSWR from 'swr'
import { authJsonFetcher } from '../../utils/auth-fetcher'
import { adaptTaskToStrategy } from '../../adapters/strategy'
import type { UseStrategyTasksReturn } from '../../types/strategy'
import type { Task } from '../../../app/types/task'

const ZMEMORY_API_BASE = 'http://localhost:3001/api'

export function useStrategyTasks(seasonId?: string): UseStrategyTasksReturn {
  // Fetch all tasks, then filter and adapt on the frontend
  const { data: tasks, error, mutate } = useSWR<Task[]>(
    `${ZMEMORY_API_BASE}/tasks?limit=100&sort_by=updated_at&sort_order=desc`,
    authJsonFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10 seconds for more frequent updates
      onError: (error) => {
        console.error('Error fetching tasks:', error)
      }
    }
  )

  // Filter and categorize tasks
  const allStrategyTasks = tasks?.map(adaptTaskToStrategy) || []

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
      const response = await fetch(`${ZMEMORY_API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      const newTask = await response.json()
      const strategyTask = adaptTaskToStrategy(newTask)

      // Optimistically update the cache
      await mutate()

      return strategyTask
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  const updateTask = async (id: string, updateData: Partial<any>) => {
    try {
      const response = await fetch(`${ZMEMORY_API_BASE}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const updatedTask = await response.json()
      const strategyTask = adaptTaskToStrategy(updatedTask)

      // Optimistically update the cache
      await mutate()

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
        await fetch(`${ZMEMORY_API_BASE}/agents/${agentId}/brief`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
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
    loading: !tasks && !error,
    error: error?.message || null,
    createTask,
    updateTask,
    delegateTask,
    refetch: () => mutate()
  }
}