import useSWR from 'swr'
import { authJsonFetcher } from '../../../lib/utils/auth-fetcher'
import { adaptAgentToStrategy } from '../utils/strategy'
import { ZMEMORY_API_BASE } from '../../../lib/api/zmemory-api-base'
import { authManager } from '../../../lib/auth-manager'
import type { UseStrategyAgentsReturn } from '@/strategy'
import type { Agent } from 'types'
import type { Task } from 'types'

const ZFLOW_API_BASE = '/api'

export function useStrategyAgents(): UseStrategyAgentsReturn {
  // TODO: Temporarily use mock data until API endpoints are set up
  const mockAgents: Agent[] = [
    {
      id: 'claude-dev',
      name: 'Claude Dev',
      description: 'Development and coding specialist',
      status: 'online',
      provider: 'anthropic'
    },
    {
      id: 'research-assistant',
      name: 'Research Assistant',
      description: 'Research and analysis specialist',
      status: 'online',
      provider: 'openai'
    },
    {
      id: 'content-writer',
      name: 'Content Writer',
      description: 'Content creation and writing specialist',
      status: 'busy',
      provider: 'anthropic'
    }
  ]

  const mockTasks: Task[] = [
    {
      id: 'task-4',
      user_id: 'mock-user',
      title: 'Optimize database queries',
      description: 'Improve performance of task fetching',
      status: 'in_progress',
      priority: 'high',
      progress: 30,
      assignee: 'claude-dev',
      created_at: '2024-09-18T00:00:00Z',
      updated_at: '2024-09-21T00:00:00Z'
    }
  ]

  const strategyAgents = mockAgents.map(agent => {
    const assignedTasks = mockTasks.filter(task => task.assignee === agent.id) || []
    return adaptAgentToStrategy(agent, assignedTasks)
  })

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

      // TODO: Refresh agent data when real API is implemented
      // await mutateAgents()
    } catch (error) {
      console.error('Error sending brief to agent:', error)
      throw error
    }
  }

  return {
    agents: strategyAgents,
    loading: false, // Mock data is immediately available
    error: null,
    sendBrief,
    refetch: () => Promise.resolve()
  }
}

// Hook for polling agent status more frequently
export function useAgentStatus(agentId?: string) {
  // TODO: Temporarily use mock data until API endpoints are set up
  const mockAgents: Agent[] = [
    {
      id: 'claude-dev',
      name: 'Claude Dev',
      description: 'Development and coding specialist',
      status: 'online',
      provider: 'anthropic'
    },
    {
      id: 'research-assistant',
      name: 'Research Assistant',
      description: 'Research and analysis specialist',
      status: 'online',
      provider: 'openai'
    },
    {
      id: 'content-writer',
      name: 'Content Writer',
      description: 'Content creation and writing specialist',
      status: 'busy',
      provider: 'anthropic'
    }
  ]

  const agent = agentId
    ? mockAgents.find(a => a.id === agentId)
    : null

  return {
    agent,
    loading: false, // Mock data is immediately available
    error: null
  }
}
