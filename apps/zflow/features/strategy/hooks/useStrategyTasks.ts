import useSWR from 'swr'
import { strategyApi } from '../api/strategy-api'
import { tasksApi, aiTasksApi } from '@/lib/api'
import type { ApiStrategyTask } from '../api/strategy-api'
import type { UseStrategyTasksReturn, StrategyTask } from '@/strategy'
import type { Task } from 'types'

// =====================================================
// API to Frontend Type Adapter
// =====================================================

// Status mapping between timeline tasks and strategy tasks
function mapTimelineStatusToStrategy(status: Task['status']): 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' {
  switch (status) {
    case 'on_hold':
      return 'blocked'
    case 'pending':
    case 'in_progress':
    case 'completed':
    case 'cancelled':
      return status
    default:
      return 'pending'
  }
}

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
    timelineTaskId: apiTask.task_id || undefined,
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
      // Validate required initiative_id
      if (!data.initiativeId) {
        throw new Error('Task creation requires a valid initiative. Please create an initiative first or select an existing one.')
      }

      // Step 1: Create timeline task first (source of truth)
      const timelineTaskData = {
        title: data.content?.title || data.title,
        description: data.content?.description || data.description,
        status: data.content?.status || data.status || 'pending',
        priority: data.content?.priority || data.priority || 'medium',
        progress: data.content?.progress || data.progress || 0,
        assignee: data.content?.assignee || data.assignee,
        tags: [...(data.tags || []), 'strategy-linked']
      }

      const timelineTask = await tasksApi.create(timelineTaskData)

      // Step 2: Create strategy task linked to timeline task
      const strategyTaskData = {
        initiative_id: data.initiativeId,
        task_id: timelineTask.id, // Link to timeline task
        title: timelineTask.content.title,
        description: timelineTask.content.description,
        status: mapTimelineStatusToStrategy(timelineTask.content.status),
        priority: timelineTask.content.priority,
        progress: timelineTask.content.progress || 0,
        assignee: timelineTask.content.assignee,
        tags: data.tags || ['strategy', 'from-scratchpad'],
        strategic_importance: 'medium' as 'medium'
      }

      const newStrategyTask = await strategyApi.createStrategyTask(strategyTaskData)
      const strategyTask = adaptApiTaskToStrategy(newStrategyTask as ApiStrategyTask)

      // Update cache
      await mutate()

      return strategyTask
    } catch (error) {
      console.error('Error creating strategic task:', error)
      // If strategy task creation fails but timeline task was created, we might want to handle cleanup
      throw error
    }
  }

  const updateTask = async (id: string, updateData: Partial<any>) => {
    try {
      // Find the strategy task to get linked timeline task
      const existingTask = allStrategyTasks.find((task: StrategyTask) => task.id === id)
      if (!existingTask) {
        throw new Error('Strategy task not found')
      }

      // If there's a linked timeline task, update it first
      if (existingTask.timelineTaskId && updateData.content) {
        const timelineUpdateData = {
          title: updateData.content.title,
          description: updateData.content.description,
          status: updateData.content.status,
          priority: updateData.content.priority,
          progress: updateData.content.progress,
          assignee: updateData.content.assignee
        }

        // Remove undefined values
        const cleanedData = Object.fromEntries(
          Object.entries(timelineUpdateData).filter(([_, value]) => value !== undefined)
        )

        if (Object.keys(cleanedData).length > 0) {
          await tasksApi.update(existingTask.timelineTaskId, cleanedData)
        }
      }

      // TODO: Implement update strategic task API endpoint
      // For now, we'll just refetch data
      await mutate()

      return { ...existingTask, ...updateData }
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  const promoteTimelineTaskToStrategy = async (timelineTaskId: string, initiativeId: string) => {
    try {
      // Get the timeline task
      const timelineTask = await tasksApi.getById(timelineTaskId)

      // Create strategy task linked to existing timeline task
      const strategyTaskData = {
        initiative_id: initiativeId,
        task_id: timelineTask.id,
        title: timelineTask.content.title || '',
        description: timelineTask.content.description,
        status: mapTimelineStatusToStrategy(timelineTask.content.status || 'pending'),
        priority: timelineTask.content.priority || 'medium',
        progress: timelineTask.content.progress || 0,
        assignee: timelineTask.content.assignee,
        tags: ['strategy', 'promoted-from-timeline'],
        strategic_importance: 'medium' as 'medium'
      }

      const newStrategyTask = await strategyApi.createStrategyTask(strategyTaskData)

      // Update timeline task to mark as strategy-linked
      await tasksApi.update(timelineTaskId, {
        tags: [...(timelineTask.tags || []), 'strategy-linked']
      })

      // Update cache
      await mutate()

      return adaptApiTaskToStrategy(newStrategyTask as ApiStrategyTask)
    } catch (error) {
      console.error('Error promoting timeline task to strategy:', error)
      throw error
    }
  }

  const delegateTask = async (taskId: string, agentId: string, briefing: string) => {
    try {
      // Find the strategy task to get timeline task ID
      const strategyTask = allStrategyTasks.find((task: StrategyTask) => task.id === taskId)
      if (!strategyTask) {
        throw new Error('Strategy task not found')
      }

      // Step 1: Create AI Task linked to timeline task
      const aiTaskData = {
        task_id: strategyTask.timelineTaskId || strategyTask.id, // Use timeline task ID if available
        agent_id: agentId,
        objective: briefing,
        task_type: 'general', // Default task type
        mode: 'plan_only' as const,
        metadata: {
          priority: strategyTask.priority,
          tags: ['strategy-delegated', 'from-strategy-task']
        },
        status: 'pending' as const
      }

      const aiTask = await aiTasksApi.create(aiTaskData)

      // Step 2: Update timeline task to mark as AI-assigned
      if (strategyTask.timelineTaskId) {
        await tasksApi.update(strategyTask.timelineTaskId, {
          assignee: `ai:${agentId}`,
          tags: [...(strategyTask.tags || []), 'ai-assigned']
        })
      }

      // Step 3: Use the strategy API delegation endpoint
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
        const adapted = adaptApiTaskToStrategy(updatedTask)
        // Add AI task reference
        adapted.aiTaskId = aiTask.id
        return adapted
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
    promoteTimelineTaskToStrategy,
    refetch: () => mutate()
  }
}
