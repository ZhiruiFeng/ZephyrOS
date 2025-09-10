import { useState, useEffect, useCallback } from 'react'
import { AgentVendor, AgentFeature } from '../app/components/profile/modules/AgentDirectory'
import { getAuthHeader } from '../lib/supabase'

// API Response Types
export interface AIAgent {
  id: string
  user_id: string
  vendor: AgentVendor
  name: string
  features: AgentFeature[]
  notes?: string
  activity_score: number
  created_at: string
  updated_at: string
}

export interface AIInteraction {
  id: string
  user_id: string
  agent_id: string
  title: string
  started_at: string
  external_link?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface AIUsageStats {
  id: string
  user_id: string
  agent_id: string
  stat_date: string
  interaction_count: number
  total_duration_minutes: number
  last_interaction_at?: string
  created_at: string
  updated_at: string
}

// API Request Types
export interface CreateAgentRequest {
  vendor: AgentVendor
  name: string
  features?: AgentFeature[]
  notes?: string
  activity_score?: number
}

export interface CreateInteractionRequest {
  agent_id: string
  title: string
  started_at?: string
  external_link?: string
  tags?: string[]
  interaction_type?: 'conversation' | 'brainstorming' | 'coding' | 'research' | 'creative' | 'analysis' | 'other'
}

// Custom Hooks
export function useAIAgents() {
  const [agents, setAgents] = useState<AIAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/ai-agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`)
      }

      const data = await response.json()
      const agentsData = data.agents || data
      setAgents(Array.isArray(agentsData) ? agentsData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents')
      console.error('Error fetching agents:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createAgent = useCallback(async (agentData: CreateAgentRequest): Promise<AIAgent | null> => {
    try {
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/ai-agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(agentData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.statusText}`)
      }

      const responseData = await response.json()
      const newAgent = responseData.agent || responseData
      setAgents(prev => {
        const currentAgents = Array.isArray(prev) ? prev : []
        return [...currentAgents, newAgent]
      })
      return newAgent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
      console.error('Error creating agent:', err)
      return null
    }
  }, [])

  const updateAgent = useCallback(async (id: string, agentData: Partial<CreateAgentRequest>): Promise<AIAgent | null> => {
    try {
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/ai-agents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(agentData),
      })

      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.statusText}`)
      }

      const responseData = await response.json()
      const updatedAgent = responseData.agent || responseData
      setAgents(prev => {
        const currentAgents = Array.isArray(prev) ? prev : []
        return currentAgents.map(agent => agent.id === id ? updatedAgent : agent)
      })
      return updatedAgent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent')
      console.error('Error updating agent:', err)
      return null
    }
  }, [])

  const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/ai-agents/${id}`, {
        method: 'DELETE',
        headers: {
          ...authHeaders,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete agent: ${response.statusText}`)
      }

      setAgents(prev => {
        const currentAgents = Array.isArray(prev) ? prev : []
        return currentAgents.filter(agent => agent.id !== id)
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent')
      console.error('Error deleting agent:', err)
      return false
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  return {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
  }
}

export function useAIInteractions() {
  const [interactions, setInteractions] = useState<AIInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInteractions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/ai-interactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch interactions: ${response.statusText}`)
      }

      const data = await response.json()
      const interactionsData = data.interactions || data
      setInteractions(Array.isArray(interactionsData) ? interactionsData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch interactions')
      console.error('Error fetching interactions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createInteraction = useCallback(async (interactionData: CreateInteractionRequest): Promise<AIInteraction | null> => {
    try {
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/ai-interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(interactionData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create interaction: ${response.statusText}`)
      }

      const responseData = await response.json()
      const newInteraction = responseData.interaction || responseData
      setInteractions(prev => {
        const currentInteractions = Array.isArray(prev) ? prev : []
        return [newInteraction, ...currentInteractions]
      })
      return newInteraction
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create interaction')
      console.error('Error creating interaction:', err)
      return null
    }
  }, [])

  const updateInteraction = useCallback(async (id: string, interactionData: Partial<CreateInteractionRequest>): Promise<AIInteraction | null> => {
    try {
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/ai-interactions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(interactionData),
      })

      if (!response.ok) {
        throw new Error(`Failed to update interaction: ${response.statusText}`)
      }

      const updatedInteraction = await response.json()
      setInteractions(prev => {
        const currentInteractions = Array.isArray(prev) ? prev : []
        return currentInteractions.map(interaction => interaction.id === id ? updatedInteraction : interaction)
      })
      return updatedInteraction
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update interaction')
      console.error('Error updating interaction:', err)
      return null
    }
  }, [])

  const deleteInteraction = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/ai-interactions/${id}`, {
        method: 'DELETE',
        headers: {
          ...authHeaders,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete interaction: ${response.statusText}`)
      }

      setInteractions(prev => {
        const currentInteractions = Array.isArray(prev) ? prev : []
        return currentInteractions.filter(interaction => interaction.id !== id)
      })
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete interaction')
      console.error('Error deleting interaction:', err)
      return false
    }
  }, [])

  useEffect(() => {
    fetchInteractions()
  }, [fetchInteractions])

  return {
    interactions,
    loading,
    error,
    fetchInteractions,
    createInteraction,
    updateInteraction,
    deleteInteraction,
  }
}

export function useAIUsageStats() {
  const [stats, setStats] = useState<AIUsageStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api'
      const response = await fetch(`${apiUrl}/ai-usage-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch usage stats: ${response.statusText}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage stats')
      console.error('Error fetching usage stats:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    fetchStats,
  }
}
