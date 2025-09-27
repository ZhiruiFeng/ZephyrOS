import useSWR, { mutate } from 'swr'
import { useState, useCallback } from 'react'
import { API_BASE } from '@/lib/api'
import { authManager } from '@/lib/auth-manager'
import { type RelationType } from '@/app/components/memory/RelationTypeBadge'

export interface EpisodeMemoryAnchor {
  memory_id: string
  episode_id: string
  relation_type: RelationType
  local_time_range?: { start: string; end?: string } | null
  weight?: number
  notes?: string
  created_at: string
  episode?: {
    id: string
    season_id: string
    title: string
    date_range_start: string
    date_range_end: string
    mood_emoji?: string
    reflection?: string
  }
}

export interface CreateEpisodeAnchorRequest {
  episode_id: string
  relation_type: RelationType
  weight?: number
  local_time_range?: { start: string; end?: string }
  notes?: string
}

interface Memory {
  id: string
  title: string
  note: string
  tags?: string[]
  created_at: string
  updated_at: string
}

const memoryEpisodeApi = {
  async getEpisodeAnchors(memoryId: string): Promise<EpisodeMemoryAnchor[]> {
    const authHeaders = await authManager.getAuthHeaders()
    const resp = await fetch(`${API_BASE}/memories/${memoryId}/episode-anchors`, {
      headers: { ...authHeaders }
    })
    if (!resp.ok) {
      if (resp.status === 404) return []
      const text = await resp.text()
      throw new Error(`Failed to fetch episode anchors: ${resp.statusText} - ${text}`)
    }
    return resp.json()
  },

  async createEpisodeAnchor(memoryId: string, data: CreateEpisodeAnchorRequest): Promise<EpisodeMemoryAnchor> {
    const authHeaders = await authManager.getAuthHeaders()
    const resp = await fetch(`${API_BASE}/memories/${memoryId}/episode-anchors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(data)
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Failed to create episode anchor: ${resp.statusText} - ${text}`)
    }
    return resp.json()
  },

  async updateEpisodeAnchor(memoryId: string, episodeId: string, data: Partial<CreateEpisodeAnchorRequest>): Promise<EpisodeMemoryAnchor> {
    const authHeaders = await authManager.getAuthHeaders()
    const resp = await fetch(`${API_BASE}/memories/${memoryId}/episode-anchors/${episodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(data)
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Failed to update episode anchor: ${resp.statusText} - ${text}`)
    }
    return resp.json()
  },

  async deleteEpisodeAnchor(memoryId: string, episodeId: string, relationType?: RelationType): Promise<void> {
    const authHeaders = await authManager.getAuthHeaders()
    const url = new URL(`${API_BASE}/memories/${memoryId}/episode-anchors/${episodeId}`)
    if (relationType) url.searchParams.set('relation_type', relationType)
    const resp = await fetch(url.toString(), { method: 'DELETE', headers: { ...authHeaders } })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`Failed to delete episode anchor: ${resp.statusText} - ${text}`)
    }
  }
}

export function useEpisodeMemoryAnchors(memoryId: string) {
  const { data, error, isLoading, mutate: refetch } = useSWR(
    memoryId ? `episode-anchors-${memoryId}` : null,
    () => memoryEpisodeApi.getEpisodeAnchors(memoryId),
    { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 10000 }
  )

  return {
    anchors: (data as EpisodeMemoryAnchor[]) || [],
    isLoading,
    error,
    refetch
  }
}

export function useEpisodeMemoryActions() {
  const [isLoading, setIsLoading] = useState(false)

  const createMemoryWithEpisodeAnchor = useCallback(async (
    memoryData: { title: string; note: string; tags?: string[] },
    anchorData: CreateEpisodeAnchorRequest
  ) => {
    setIsLoading(true)
    try {
      // Create memory
      const authHeaders = await authManager.getAuthHeaders()
      const createResp = await fetch(`${API_BASE}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          title: memoryData.title,
          note: memoryData.note,
          memory_type: 'note',
          tags: memoryData.tags || [],
          emotion_valence: 0,
          emotion_arousal: 0,
          energy_delta: 0,
          is_highlight: false,
          salience_score: 0.5,
          source: 'manual'
        })
      })
      if (!createResp.ok) {
        const text = await createResp.text()
        throw new Error(`Failed to create memory: ${createResp.statusText} - ${text}`)
      }
      const memory: Memory = await createResp.json()

      // Create episode anchor
      const anchor = await memoryEpisodeApi.createEpisodeAnchor(memory.id, anchorData)

      await mutate(`episode-anchors-${memory.id}`, undefined, { revalidate: true })
      return { memory, anchor }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const linkMemoryToEpisode = useCallback(async (
    memoryId: string,
    anchorData: CreateEpisodeAnchorRequest
  ) => {
    setIsLoading(true)
    try {
      const anchor = await memoryEpisodeApi.createEpisodeAnchor(memoryId, anchorData)
      await mutate(`episode-anchors-${memoryId}`, undefined, { revalidate: true })
      return anchor
    } finally {
      setIsLoading(false)
    }
  }, [])

  const removeMemoryFromEpisode = useCallback(async (
    memoryId: string,
    episodeId: string,
    relationType?: RelationType
  ) => {
    setIsLoading(true)
    try {
      await memoryEpisodeApi.deleteEpisodeAnchor(memoryId, episodeId, relationType)
      await mutate(`episode-anchors-${memoryId}`, undefined, { revalidate: true })
      return { success: true }
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    createMemoryWithEpisodeAnchor,
    linkMemoryToEpisode,
    removeMemoryFromEpisode,
    isLoading
  }
}


