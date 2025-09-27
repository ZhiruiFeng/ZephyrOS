import { useEffect } from 'react'
import useSWR from 'swr'
import { aiTasksApi, tasksApi } from '@/lib/api'
import type { AITask } from '@/lib/api/ai-api'
import type { StrategyTask } from '@/features/strategy'

// =====================================================
// AI Task Status Synchronization Hook
// =====================================================

interface UseAITaskSyncProps {
  strategyTasks: StrategyTask[]
  onTaskUpdate?: (taskId: string, updates: Partial<StrategyTask>) => void
}

export function useAITaskSync({ strategyTasks, onTaskUpdate }: UseAITaskSyncProps) {
  // Get all AI task IDs from strategy tasks
  const aiTaskIds = strategyTasks
    .map(task => task.aiTaskId)
    .filter(Boolean) as string[]

  // Fetch AI tasks for monitoring
  const { data: aiTasks, error, mutate } = useSWR(
    aiTaskIds.length > 0 ? ['ai-tasks', aiTaskIds] : null,
    async () => {
      if (aiTaskIds.length === 0) return []

      const tasks = await Promise.all(
        aiTaskIds.map(id => aiTasksApi.get(id).catch(() => null))
      )

      return tasks.filter(Boolean) as AITask[]
    },
    {
      refreshInterval: 10000, // Poll every 10 seconds
      revalidateOnFocus: true
    }
  )

  // Status mapping from AI tasks to strategy tasks
  const mapAIStatusToAgentStatus = (aiStatus: AITask['status']): StrategyTask['agentStatus'] => {
    switch (aiStatus) {
      case 'pending':
      case 'assigned':
        return 'idle'
      case 'in_progress':
        return 'working'
      case 'paused':
      case 'failed':
        return 'blocked'
      case 'completed':
      case 'cancelled':
        return 'idle'
      default:
        return 'idle'
    }
  }

  const mapAIStatusToTaskStatus = (aiStatus: AITask['status']): StrategyTask['status'] => {
    switch (aiStatus) {
      case 'completed':
        return 'completed'
      case 'failed':
      case 'cancelled':
        return 'on_hold'
      case 'in_progress':
        return 'in_progress'
      default:
        return 'pending'
    }
  }

  // Sync AI task status changes back to strategy tasks and timeline tasks
  useEffect(() => {
    if (!aiTasks || !onTaskUpdate) return

    aiTasks.forEach(aiTask => {
      // Find the corresponding strategy task
      const strategyTask = strategyTasks.find(task => task.aiTaskId === aiTask.id)
      if (!strategyTask) return

      const newAgentStatus = mapAIStatusToAgentStatus(aiTask.status)
      const newTaskStatus = mapAIStatusToTaskStatus(aiTask.status)

      // Check if status has changed
      if (strategyTask.agentStatus !== newAgentStatus || strategyTask.status !== newTaskStatus) {
        // Update strategy task
        onTaskUpdate(strategyTask.id, {
          agentStatus: newAgentStatus,
          status: newTaskStatus,
          progress: aiTask.status === 'completed' ? 100 : strategyTask.progress
        })

        // Also update the linked timeline task
        if (strategyTask.timelineTaskId) {
          tasksApi.update(strategyTask.timelineTaskId, {
            status: newTaskStatus,
            progress: aiTask.status === 'completed' ? 100 : strategyTask.progress,
            assignee: aiTask.status === 'completed' ? undefined : `ai:${aiTask.agent_id}`
          }).catch(error => {
            console.warn('Failed to sync AI task status to timeline task:', error)
          })
        }
      }
    })
  }, [aiTasks, strategyTasks, onTaskUpdate])

  return {
    aiTasks: aiTasks || [],
    loading: !error && !aiTasks && aiTaskIds.length > 0,
    error: error?.message || null,
    refetch: () => mutate()
  }
}

// =====================================================
// AI Task Progress Tracking
// =====================================================

export function getAITaskProgress(aiTask: AITask): {
  progressPercent: number
  statusText: string
  isActive: boolean
} {
  switch (aiTask.status) {
    case 'pending':
      return {
        progressPercent: 0,
        statusText: 'Queued for agent',
        isActive: false
      }
    case 'assigned':
      return {
        progressPercent: 10,
        statusText: 'Assigned to agent',
        isActive: false
      }
    case 'in_progress':
      return {
        progressPercent: 50,
        statusText: 'Agent working',
        isActive: true
      }
    case 'paused':
      return {
        progressPercent: 50,
        statusText: 'Paused',
        isActive: false
      }
    case 'completed':
      return {
        progressPercent: 100,
        statusText: 'Completed by agent',
        isActive: false
      }
    case 'failed':
      return {
        progressPercent: 0,
        statusText: 'Failed',
        isActive: false
      }
    case 'cancelled':
      return {
        progressPercent: 0,
        statusText: 'Cancelled',
        isActive: false
      }
    default:
      return {
        progressPercent: 0,
        statusText: 'Unknown status',
        isActive: false
      }
  }
}

// =====================================================
// AI Task Management Actions
// =====================================================

export async function cancelAITask(aiTaskId: string): Promise<void> {
  try {
    await aiTasksApi.update(aiTaskId, { status: 'cancelled' })
  } catch (error) {
    console.error('Failed to cancel AI task:', error)
    throw error
  }
}

export async function pauseAITask(aiTaskId: string): Promise<void> {
  try {
    await aiTasksApi.update(aiTaskId, { status: 'paused' })
  } catch (error) {
    console.error('Failed to pause AI task:', error)
    throw error
  }
}

export async function resumeAITask(aiTaskId: string): Promise<void> {
  try {
    await aiTasksApi.update(aiTaskId, { status: 'in_progress' })
  } catch (error) {
    console.error('Failed to resume AI task:', error)
    throw error
  }
}