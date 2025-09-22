import useSWR from 'swr'
import { strategyApi } from '../../api/strategy'
import type { ApiStrategyTask } from '../../api/strategy'
import type { UseStrategyTasksReturn, StrategyTask } from '../../types/strategy'

// =====================================================
// API to Frontend Type Adapter
// =====================================================

function adaptApiTaskToStrategy(apiTask: ApiStrategyTask): StrategyTask {
  return {
    id: apiTask.id,
    user_id: apiTask.user_id,
    title: apiTask.title,
    description: apiTask.description || undefined,
    status: apiTask.status === 'blocked' ? 'on_hold' : apiTask.status,
    priority: apiTask.priority,
    progress: apiTask.progress,
    category: undefined, // Will need to be populated from categories API
    tags: apiTask.tags || [],
    assignee: apiTask.assignee || undefined,
    created_at: apiTask.created_at,
    updated_at: apiTask.updated_at,
    due_date: apiTask.due_date || undefined,
    completion_date: apiTask.completion_date || undefined,
    estimated_duration: apiTask.estimated_duration || undefined,
    notes: apiTask.description || undefined,
    // Strategy-specific fields
    initiativeId: apiTask.initiative_id,
    initiativeTitle: apiTask.initiative?.title,
    assignedAgent: apiTask.ai_delegation ? {
      id: apiTask.ai_delegation.ai_task_id,
      name: apiTask.ai_delegation.agent_name,
      description: `${apiTask.ai_delegation.agent_vendor} agent`,
      status: 'online' as const,
      provider: 'anthropic' as const
    } : undefined,
    agentStatus: apiTask.ai_delegation ?
      (apiTask.ai_delegation.status === 'in_progress' ? 'working' :
       apiTask.ai_delegation.status === 'completed' ? 'idle' : 'blocked') : undefined
  }
}

export function useStrategyTasks(seasonId?: string): UseStrategyTasksReturn {
  // Fetch strategic tasks from API
  const { data: tasksData, error, isLoading, mutate } = useSWR(
    ['/strategy/tasks', seasonId],
    () => strategyApi.getStrategyTasks({
      limit: 100,
      // If seasonId is provided, we'll need to filter by season through initiatives
      // For now, fetch all and filter client-side
    }),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      errorRetryCount: 3
    }
  )

  // Transform API data to frontend format
  const allStrategyTasks = tasksData && Array.isArray(tasksData) ? tasksData.map(adaptApiTaskToStrategy) : []

  // Filter out initiative tasks (they're shown separately)
  const nonInitiativeTasks = allStrategyTasks.filter(task =>
    !task.tags?.includes('initiative')
  )

  // Filter by season if provided
  const filteredTasks = seasonId
    ? nonInitiativeTasks.filter(() => {
        // TODO: Filter by season through initiative relationship
        // For now, return all tasks
        return true
      })
    : nonInitiativeTasks

  const myTasks = filteredTasks.filter(task =>
    !task.assignee || task.assignee === 'me'
  )

  const agentTasks = filteredTasks.filter(task =>
    task.assignee && task.assignee !== 'me'
  )

  const createTask = async (data: any) => {
    try {
      // Transform the legacy task creation format to strategic task format
      const strategyTaskData = {
        initiative_id: data.initiativeId || 'default-initiative', // TODO: Handle this better
        title: data.content?.title || data.title,
        description: data.content?.description || data.description,
        status: data.content?.status || data.status || 'pending',
        priority: data.content?.priority || data.priority || 'medium',
        progress: data.content?.progress || data.progress || 0,
        assignee: data.content?.assignee || data.assignee,
        tags: data.tags || ['strategy', 'from-scratchpad']
      }

      const newTask = await strategyApi.createStrategyTask(strategyTaskData)
      const strategyTask = adaptApiTaskToStrategy(newTask as ApiStrategyTask)

      // Update cache
      await mutate()

      return strategyTask
    } catch (error) {
      console.error('Error creating strategic task:', error)
      throw error
    }
  }

  const updateTask = async (id: string, updateData: Partial<any>) => {
    try {
      // TODO: Implement update strategic task API endpoint
      // For now, we'll just refetch data
      await mutate()

      // Return mock updated task
      const existingTask = allStrategyTasks.find((task: StrategyTask) => task.id === id)
      if (!existingTask) {
        throw new Error('Task not found')
      }

      return { ...existingTask, ...updateData }
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  const delegateTask = async (taskId: string, agentId: string, briefing: string) => {
    try {
      // Use the strategy API delegation endpoint
      await strategyApi.delegateStrategyTask(taskId, {
        agent_id: agentId,
        objective: briefing,
        mode: 'plan_only'
      })

      // Update cache to reflect changes
      await mutate()

      // Find and return the updated task
      const updatedTasks = await strategyApi.getStrategyTasks()
      const updatedTask = Array.isArray(updatedTasks) ? updatedTasks.find((t: ApiStrategyTask) => t.id === taskId) : undefined

      if (updatedTask) {
        return adaptApiTaskToStrategy(updatedTask)
      }

      throw new Error('Failed to find updated task after delegation')
    } catch (error) {
      console.error('Error delegating task:', error)
      throw error
    }
  }

  return {
    myTasks,
    agentTasks,
    loading: isLoading,
    error: error?.message || null,
    createTask,
    updateTask,
    delegateTask,
    refetch: () => mutate()
  }
}
