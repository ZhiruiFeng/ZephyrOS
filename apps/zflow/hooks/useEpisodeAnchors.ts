import useSWR from 'swr'
import { API_BASE } from '../lib/api'
import { authManager } from '../lib/auth-manager'
import { type RelationType } from '../app/components/memory/RelationTypeBadge'

export interface EpisodeAnchoredMemory {
  memory_id: string
  episode_id: string
  relation_type: RelationType
  local_time_range?: { start: string; end?: string } | null
  weight?: number
  notes?: string
  created_at: string
  memory?: {
    id: string
    title?: string
    note?: string
    tags?: string[]
    created_at: string
    updated_at: string
  }
}

async function fetchEpisodeAnchors(episodeId: string): Promise<EpisodeAnchoredMemory[]> {
  const headers = await authManager.getAuthHeaders()
  const resp = await fetch(`${API_BASE}/api/episodes/${episodeId}/anchors`, { headers })
  if (!resp.ok) {
    if (resp.status === 404) return []
    const text = await resp.text()
    throw new Error(`Failed to fetch episode anchors: ${resp.statusText} - ${text}`)
  }
  return resp.json()
}

export function useEpisodeAnchors(episodeId: string) {
  const { data, error, isLoading, mutate: refetch } = useSWR(
    episodeId ? `episode-anchors-list-${episodeId}` : null,
    () => fetchEpisodeAnchors(episodeId),
    { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 10000 }
  )

  return {
    anchors: (data as EpisodeAnchoredMemory[]) || [],
    isLoading,
    error,
    refetch
  }
}


