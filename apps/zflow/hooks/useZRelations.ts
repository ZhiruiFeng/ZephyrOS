import useSWR from 'swr'
import { useState } from 'react'
import { getAuthHeader } from '../lib/supabase'

// Types based on our API schema
export interface Person {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  job_title?: string
  location?: string
  avatar_url?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface RelationshipProfile {
  id: string
  person_id: string
  tier: 5 | 15 | 50 | 150
  health_score: number
  last_contact_at?: string
  cadence_days: number
  is_dormant: boolean
  reason_for_tier?: string
  relationship_context?: string
  how_met?: string
  reciprocity_balance: number
  person?: Person
  created_at: string
  updated_at: string
}

export interface Touchpoint {
  id: string
  person_id: string
  channel: 'email' | 'phone' | 'text' | 'in_person' | 'video_call' | 'social_media' | 'messaging_app' | 'other'
  direction: 'outbound' | 'inbound'
  summary: string
  sentiment: number
  duration_minutes?: number
  is_give: boolean
  give_ask_type?: string
  context?: string
  tags?: string[]
  needs_followup: boolean
  followup_date?: string
  followup_notes?: string
  person?: Person
  created_at: string
}

export interface CheckinItem {
  person_id: string
  person: Person
  tier: number
  health_score: number
  last_contact_at?: string
  cadence_days: number
  days_overdue: number
  reason_for_tier?: string
  relationship_context?: string
  recent_touchpoints: Array<{
    id: string
    summary: string
    channel: string
    sentiment: number
    created_at: string
  }>
}

export interface CheckinQueue {
  checkins: CheckinItem[]
  summary: {
    total_due: number
    overdue: number
    due_today: number
    due_soon: number
    average_health_score: number
  }
}

export interface ReconnectSuggestion {
  person_id: string
  person: Person
  tier: number
  last_contact_at: string
  days_since_last_contact: number
  how_met?: string
  relationship_context?: string
  last_interaction_summary?: string
  suggested_opener: string
  suggested_channels: string[]
  revival_potential_score: number
}

export interface BrokerageOpportunity {
  id: string
  person_a: Person
  person_b: Person
  rationale: string
  mutual_benefit_potential: string
  introduction_context: string
  suggested_setting: string
  strength_score: number
  mutual_benefit_score: number
  introduction_likelihood: number
  suggested_message: string
  next_steps: string[]
  tags: string[]
}

// API configuration
const ZMEMORY_API_BASE = (() => {
  const envBase = process.env.NEXT_PUBLIC_API_BASE
  if (envBase) return envBase
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location
    // Local dev: zflow on 3000, zmemory on 3001
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const targetPort = port === '3000' ? '3001' : (port || '3001')
      return `${protocol}//${hostname}:${targetPort}`
    }
    // Production default: same origin (avoid mixed content)
    return `${protocol}//${hostname}${port ? `:${port}` : ''}`
  }
  // SSR fallback (rare for this client hook): assume local dev
  return 'http://localhost:3001'
})()

// Fetcher function for SWR with authentication
const fetcher = async (url: string) => {
  const authHeaders = await getAuthHeader()
  try {
    const response = await fetch(`${ZMEMORY_API_BASE}${url}`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      }
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`)
    }
    return response.json()
  } catch (err) {
    if (err instanceof TypeError) {
      // Likely CORS, mixed content (https->http), or network error
      throw new Error(`Network error while fetching ${ZMEMORY_API_BASE}${url}. Possible CORS or mixed content. Original: ${err.message}`)
    }
    throw err
  }
}

// Custom hook for check-in queue
export function useCheckinQueue() {
  const { data, error, isLoading, mutate } = useSWR<CheckinQueue>(
    '/api/relations/checkins/today',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      revalidateOnFocus: true,
    }
  )

  return {
    queue: data,
    isLoading,
    error,
    refresh: mutate,
  }
}

// Custom hook for relationship profiles
export function useRelationshipProfiles(params?: {
  tier?: number
  is_dormant?: boolean
  limit?: number
}) {
  const queryParams = new URLSearchParams()
  if (params?.tier) queryParams.append('tier', params.tier.toString())
  if (params?.is_dormant !== undefined) queryParams.append('is_dormant', params.is_dormant.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())

  const queryString = queryParams.toString()
  const { data, error, isLoading, mutate } = useSWR<RelationshipProfile[]>(
    `/api/relations/profiles${queryString ? `?${queryString}` : ''}`,
    fetcher
  )

  return {
    profiles: data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// Custom hook for people/contacts
export function usePeople(params?: {
  search?: string
  limit?: number
}) {
  const queryParams = new URLSearchParams()
  if (params?.search) queryParams.append('search', params.search)
  if (params?.limit) queryParams.append('limit', params.limit.toString())

  const queryString = queryParams.toString()
  const { data, error, isLoading, mutate } = useSWR<Person[]>(
    `/api/relations/people${queryString ? `?${queryString}` : ''}`,
    fetcher
  )

  return {
    people: data || [],
    isLoading,
    error,
    refresh: mutate,
  }
}

// Custom hook for reconnect suggestions
export function useReconnectSuggestions(limit: number = 5) {
  const { data, error, isLoading, mutate } = useSWR<{ suggestions: ReconnectSuggestion[], summary: any }>(
    `/api/relations/reconnect?limit=${limit}`,
    fetcher,
    {
      refreshInterval: 60 * 60 * 1000, // Refresh every hour
    }
  )

  return {
    suggestions: data?.suggestions || [],
    summary: data?.summary,
    isLoading,
    error,
    refresh: mutate,
  }
}

// Custom hook for brokerage opportunities
export function useBrokerageOpportunities(limit: number = 3) {
  const { data, error, isLoading, mutate } = useSWR<{ opportunities: BrokerageOpportunity[], summary: any }>(
    `/api/relations/brokerage?limit=${limit}`,
    fetcher,
    {
      refreshInterval: 2 * 60 * 60 * 1000, // Refresh every 2 hours
    }
  )

  return {
    opportunities: data?.opportunities || [],
    summary: data?.summary,
    isLoading,
    error,
    refresh: mutate,
  }
}

// Custom hook for logging touchpoints
export function useLogTouchpoint() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logTouchpoint = async (touchpointData: {
    person_id: string
    channel: string
    direction: 'outbound' | 'inbound'
    summary: string
    sentiment?: number
    duration_minutes?: number
    is_give?: boolean
    give_ask_type?: string
    context?: string
    tags?: string[]
    needs_followup?: boolean
    followup_date?: string
    followup_notes?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${ZMEMORY_API_BASE}/api/relations/touchpoints`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(touchpointData),
      })

      if (!response.ok) {
        throw new Error('Failed to log touchpoint')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    logTouchpoint,
    isLoading,
    error,
  }
}

// Custom hook for creating/updating relationship profiles
export function useRelationshipProfile() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createProfile = async (profileData: {
    person_id: string
    tier: 5 | 15 | 50 | 150
    cadence_days?: number
    reason_for_tier?: string
    relationship_context?: string
    how_met?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${ZMEMORY_API_BASE}/api/relations/profiles`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        throw new Error('Failed to create relationship profile')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (profileId: string, updateData: {
    tier?: 5 | 15 | 50 | 150
    cadence_days?: number
    reason_for_tier?: string
    relationship_context?: string
    how_met?: string
    is_dormant?: boolean
    health_score?: number
    reciprocity_balance?: number
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${ZMEMORY_API_BASE}/api/relations/profiles/${profileId}`, {
        method: 'PUT',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error('Failed to update relationship profile')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createProfile,
    updateProfile,
    isLoading,
    error,
  }
}

// Custom hook for managing people/contacts
export function usePeopleManager() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPerson = async (personData: {
    name: string
    email?: string
    phone?: string
    company?: string
    job_title?: string
    location?: string
    avatar_url?: string
    notes?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${ZMEMORY_API_BASE}/api/relations/people`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(personData),
      })

      if (!response.ok) {
        throw new Error('Failed to create person')
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updatePerson = async (
    personId: string,
    personData: {
      name?: string
      email?: string
      phone?: string
      company?: string
      job_title?: string
      location?: string
      avatar_url?: string
      notes?: string
    }
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const authHeaders = await getAuthHeader()
      const response = await fetch(`${ZMEMORY_API_BASE}/api/relations/people/${personId}`, {
        method: 'PUT',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(personData),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to update person: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`)
      }

      const result = await response.json()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createPerson,
    updatePerson,
    isLoading,
    error,
  }
}