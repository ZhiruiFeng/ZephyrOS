import { useState, useEffect, useCallback } from 'react'
import { getAuthHeader } from '../lib/supabase'
import { ZMEMORY_API_ORIGIN, IS_ZMEMORY_CROSS_ORIGIN } from '../lib/api/zmemory-api-base'

// If NEXT_PUBLIC_API_BASE is not configured, use relative path, proxy to zmemory via Next.js rewrites
const API_BASE = ZMEMORY_API_ORIGIN
const IS_CROSS_ORIGIN = IS_ZMEMORY_CROSS_ORIGIN

// Updated API Response Types for new schema
export interface Vendor {
  id: string
  name: string
  description?: string
  auth_type: 'api_key' | 'oauth' | 'bearer_token'
  base_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VendorService {
  id: string
  vendor_id: string
  service_name: string
  display_name: string
  description?: string
  is_active: boolean
}

export interface AgentFeature {
  id: string
  name: string
  description?: string
  category?: string
  icon?: string
  is_active: boolean
  sort_order: number
}

export interface InteractionType {
  id: string
  name: string
  description?: string
  category?: string
  icon?: string
  color?: string
  is_active: boolean
  sort_order: number
}

export interface AIAgent {
  id: string
  name: string
  description?: string
  vendor_id: string
  service_id?: string
  model_name?: string
  system_prompt?: string
  configuration: Record<string, any>
  capabilities: Record<string, any>
  notes?: string
  tags: string[]
  activity_score: number
  last_used_at?: string
  usage_count: number
  is_active: boolean
  is_favorite: boolean
  is_public: boolean
  user_id: string
  created_at: string
  updated_at: string
  // Populated relationships from view
  vendor?: Vendor
  service?: VendorService
  vendor_name?: string
  service_name?: string
  features?: AgentFeature[]
  recent_interactions?: number
  monthly_interactions?: number
  avg_satisfaction?: number
  avg_usefulness?: number
  monthly_cost?: number
}

export interface AIInteraction {
  id: string
  agent_id: string
  title: string
  description?: string
  interaction_type_id: string
  external_link?: string
  external_id?: string
  external_metadata: Record<string, any>
  content_preview?: string
  full_content?: string
  input_tokens?: number
  output_tokens?: number
  total_cost?: number
  tags: string[]
  keywords: string[]
  satisfaction_rating?: number
  usefulness_rating?: number
  feedback_notes?: string
  started_at?: string
  ended_at?: string
  duration_minutes?: number
  status: 'active' | 'completed' | 'archived' | 'deleted'
  user_id: string
  created_at: string
  updated_at: string
  // Populated relationships from view
  agent?: AIAgent
  interaction_type?: InteractionType
  interaction_type_name?: string
  agent_name?: string
  agent_vendor_name?: string
}

export interface AIUsageStats {
  summary: {
    total_interactions: number
    total_duration_minutes: number
    total_cost: number
    total_input_tokens: number
    total_output_tokens: number
    unique_agents: number
    active_agents: number
    avg_satisfaction: number
    avg_usefulness: number
  }
  daily_stats: Array<{
    date: string
    total_interactions: number
    total_duration_minutes: number
    total_cost: number
    total_input_tokens: number
    total_output_tokens: number
    unique_agents_used: number
    feature_usage: Record<string, number>
    vendor_usage: Record<string, number>
    avg_satisfaction?: number
    avg_usefulness?: number
  }>
  agent_stats: AIAgent[]
  feature_usage: Record<string, number>
  vendor_usage: Record<string, number>
}

// Updated API Request Types
export interface CreateAgentRequest {
  name: string
  description?: string
  vendor_id: string
  service_id?: string
  model_name?: string
  system_prompt?: string
  configuration?: Record<string, any>
  capabilities?: Record<string, any>
  notes?: string
  tags?: string[]
  activity_score?: number
  is_active?: boolean
  is_favorite?: boolean
  feature_ids?: string[]
}

export interface CreateInteractionRequest {
  agent_id: string
  title: string
  description?: string
  interaction_type_id?: string
  external_link?: string
  external_id?: string
  external_metadata?: Record<string, any>
  content_preview?: string
  full_content?: string
  input_tokens?: number
  output_tokens?: number
  total_cost?: number
  tags?: string[]
  keywords?: string[]
  satisfaction_rating?: number
  usefulness_rating?: number
  feedback_notes?: string
  started_at?: string
  ended_at?: string
  duration_minutes?: number
  status?: 'active' | 'completed' | 'archived' | 'deleted'
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
      const response = await fetch(`${API_BASE}/ai-agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
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
      
      // Check if user is authenticated
      if (!authHeaders.Authorization) {
        throw new Error('User not authenticated. Please sign in to create agents.')
      }

      const response = await fetch(`${API_BASE}/ai-agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(agentData),
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `Failed to create agent: ${response.statusText}`)
      }

      const responseData = await response.json()
      const newAgent = responseData.agent || responseData
      setAgents(prev => {
        const currentAgents = Array.isArray(prev) ? prev : []
        return [...currentAgents, newAgent]
      })
      return newAgent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create agent'
      setError(errorMessage)
      console.error('Error creating agent:', err)
      return null
    }
  }, [])

  const updateAgent = useCallback(async (id: string, agentData: Partial<CreateAgentRequest>): Promise<AIAgent | null> => {
    try {
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${API_BASE}/ai-agents`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ id, ...agentData }),
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
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
      const response = await fetch(`${API_BASE}/ai-agents?id=${id}`, {
        method: 'DELETE',
        headers: {
          ...authHeaders,
        },
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
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
      const response = await fetch(`${API_BASE}/ai-interactions`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
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
      
      // Check if user is authenticated
      if (!authHeaders.Authorization) {
        throw new Error('User not authenticated. Please sign in to create interactions.')
      }

      const response = await fetch(`${API_BASE}/ai-interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify(interactionData),
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `Failed to create interaction: ${response.statusText}`)
      }

      const responseData = await response.json()
      const newInteraction = responseData.interaction || responseData
      setInteractions(prev => {
        const currentInteractions = Array.isArray(prev) ? prev : []
        return [newInteraction, ...currentInteractions]
      })
      return newInteraction
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create interaction'
      setError(errorMessage)
      console.error('Error creating interaction:', err)
      return null
    }
  }, [])

  const updateInteraction = useCallback(async (id: string, interactionData: Partial<CreateInteractionRequest>): Promise<AIInteraction | null> => {
    try {
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${API_BASE}/ai-interactions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ id, ...interactionData }),
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
      })

      if (!response.ok) {
        throw new Error(`Failed to update interaction: ${response.statusText}`)
      }

      const responseData = await response.json()
      const updatedInteraction = responseData.interaction || responseData
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
      const response = await fetch(`${API_BASE}/ai-interactions?id=${id}`, {
        method: 'DELETE',
        headers: {
          ...authHeaders,
        },
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
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
  const [stats, setStats] = useState<AIUsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async (days?: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const queryParams = days ? `?days=${days}` : ''
      const response = await fetch(`${API_BASE}/ai-usage-stats${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
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

// Hook for vendors
export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVendors = useCallback(async (includeServices = true) => {
    try {
      setLoading(true)
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${API_BASE}/vendors?include_services=${includeServices}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch vendors: ${response.statusText}`)
      }

      const data = await response.json()
      const vendorsData = data.vendors || data
      setVendors(Array.isArray(vendorsData) ? vendorsData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors')
      console.error('Error fetching vendors:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  return {
    vendors,
    loading,
    error,
    fetchVendors,
  }
}

// Hook for agent features
export function useAgentFeatures() {
  const [features, setFeatures] = useState<AgentFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${API_BASE}/agent-features`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch agent features: ${response.statusText}`)
      }

      const data = await response.json()
      const featuresData = data.features || data
      setFeatures(Array.isArray(featuresData) ? featuresData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent features')
      console.error('Error fetching agent features:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  return {
    features,
    loading,
    error,
    fetchFeatures,
  }
}

// Hook for interaction types
export function useInteractionTypes() {
  const [types, setTypes] = useState<InteractionType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${API_BASE}/interaction-types`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        ...(IS_CROSS_ORIGIN ? {} : { credentials: 'include' })
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch interaction types: ${response.statusText}`)
      }

      const data = await response.json()
      const typesData = data.types || data
      setTypes(Array.isArray(typesData) ? typesData : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch interaction types')
      console.error('Error fetching interaction types:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  return {
    types,
    loading,
    error,
    fetchTypes,
  }
}
