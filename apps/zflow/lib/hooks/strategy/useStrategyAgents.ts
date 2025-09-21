import useSWR from 'swr'
import { authJsonFetcher } from '../../utils/auth-fetcher'
import { adaptAgentToStrategy } from '../../adapters/strategy'
import { ZMEMORY_API_BASE } from '../../api/zmemory-api-base'
import { authManager } from '../../auth-manager'
import type { UseStrategyAgentsReturn, Agent } from '../../types/strategy'
import type { Task } from '../../../app/types/task'

const ZFLOW_API_BASE = '/api'

export function useStrategyAgents(): UseStrategyAgentsReturn {
  // Fetch agents from zflow
  const { data: agents, error: agentsError, mutate: mutateAgents } = useSWR<{ agents: Agent[] }>(
    `${ZFLOW_API_BASE}/agents/registry`,
    authJsonFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds for agent status
      onError: (error) => {
        console.error('Error fetching agents:', error)
      }
    }
  )

  // Fetch tasks to compute agent workloads
  const { data: tasks, error: tasksError } = useSWR<Task[]>(
    `${ZMEMORY_API_BASE}/tasks?limit=200`,
    authJsonFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  )

  const strategyAgents = agents?.agents?.map(agent => {
    const assignedTasks = tasks?.filter(task => task.assignee === agent.id) || []
    return adaptAgentToStrategy(agent, assignedTasks)
  }) || []

  const sendBrief = async (agentId: string, content: string) => {
    try {
      // Try to send brief to zflow agent endpoint first
      const authHeaders = await authManager.getAuthHeaders()
      const response = await fetch(`${ZFLOW_API_BASE}/agents/${agentId}/brief`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          content,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send brief to agent')
      }

      // Optionally create a memory/note about the brief
      try {
        await fetch(`${ZMEMORY_API_BASE}/memories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            title: `Brief sent to ${agentId}`,
            note: content,
            memory_type: 'note',
            tags: ['agent-brief', 'strategy', agentId],
            importance_level: 'medium'
          })
        })
      } catch (memoryError) {
        console.warn('Failed to create memory for agent brief:', memoryError)
      }

      // Refresh agent data
      await mutateAgents()
    } catch (error) {
      console.error('Error sending brief to agent:', error)
      throw error
    }
  }

  return {
    agents: strategyAgents,
    loading: (!agents && !agentsError) || (!tasks && !tasksError),
    error: agentsError?.message || tasksError?.message || null,
    sendBrief,
    refetch: () => {
      mutateAgents()
    }
  }
}

// Hook for polling agent status more frequently
export function useAgentStatus(agentId?: string) {
  const { data, error } = useSWR<{ agents: Agent[] }>(
    agentId ? `${ZFLOW_API_BASE}/agents/registry` : null,
    authJsonFetcher,
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: false
    }
  )

  const agent = agentId
    ? data?.agents?.find(a => a.id === agentId)
    : null

  return {
    agent,
    loading: !data && !error,
    error: error?.message || null
  }
}
