'use client'

// =====================================================
// Narrative Feature - Episodes Hooks
// =====================================================

import useSWR from 'swr'
import { useState, useCallback } from 'react'
import { episodesApi, narrativeApi } from '../api/narrative-api'
import type {
  Episode,
  CreateEpisodeRequest,
  UpdateEpisodeRequest,
  UseEpisodesReturn,
  UseEpisodeReturn,
  UseQuickEpisodeReturn
} from '../types/narrative'

// =====================================================
// Custom hook for managing episodes
// =====================================================
export function useEpisodes(seasonId?: string, options?: {
  limit?: number
  dateFrom?: string
  dateTo?: string
}): UseEpisodesReturn {
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Build SWR key with parameters
  const swrKey = `/narrative/episodes${seasonId ? `?season_id=${seasonId}` : ''}${
    options?.limit ? `&limit=${options.limit}` : ''
  }${options?.dateFrom ? `&date_from=${options.dateFrom}` : ''}${
    options?.dateTo ? `&date_to=${options.dateTo}` : ''
  }`

  // Fetch episodes
  const {
    data: episodesResponse,
    error: fetchError,
    isLoading,
    mutate: refetchEpisodes
  } = useSWR(
    swrKey,
    () => episodesApi.list({
      season_id: seasonId,
      limit: options?.limit,
      date_from: options?.dateFrom,
      date_to: options?.dateTo
    }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000 // 30 seconds
    }
  )

  // Combined loading state
  const loading = isLoading || actionLoading

  // Combined error state
  const error = fetchError?.message || actionError

  // Get episodes array
  const episodes = episodesResponse?.episodes || []

  // =====================================================
  // Action functions with optimistic updates
  // =====================================================

  const createEpisode = useCallback(async (data: CreateEpisodeRequest): Promise<Episode> => {
    setActionLoading(true)
    setActionError(null)

    try {
      const newEpisode = await episodesApi.create(data)

      // Optimistically add to the cache
      const currentEpisodes = episodes
      const optimisticEpisodes = [newEpisode, ...currentEpisodes]

      // Update cache optimistically
      refetchEpisodes(
        { episodes: optimisticEpisodes, total: (episodesResponse?.total || 0) + 1, has_more: false },
        { revalidate: false }
      )

      // Revalidate after a short delay to ensure consistency
      setTimeout(() => {
        refetchEpisodes()
      }, 1000)

      return newEpisode
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create episode'
      setActionError(errorMessage)
      throw error
    } finally {
      setActionLoading(false)
    }
  }, [episodes, episodesResponse, refetchEpisodes])

  const updateEpisode = useCallback(async (id: string, data: UpdateEpisodeRequest): Promise<Episode> => {
    setActionLoading(true)
    setActionError(null)

    try {
      const updatedEpisode = await episodesApi.update(id, data)

      // Optimistically update the cache
      const updatedEpisodes = episodes.map(episode =>
        episode.id === id ? updatedEpisode : episode
      )

      // Update cache optimistically
      refetchEpisodes(
        { episodes: updatedEpisodes, total: episodesResponse?.total || 0, has_more: false },
        { revalidate: false }
      )

      // Revalidate after a short delay
      setTimeout(() => {
        refetchEpisodes()
      }, 1000)

      return updatedEpisode
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update episode'
      setActionError(errorMessage)
      throw error
    } finally {
      setActionLoading(false)
    }
  }, [episodes, episodesResponse, refetchEpisodes])

  const deleteEpisode = useCallback(async (id: string): Promise<void> => {
    setActionLoading(true)
    setActionError(null)

    try {
      await episodesApi.delete(id)

      // Optimistically remove from the cache
      const updatedEpisodes = episodes.filter(episode => episode.id !== id)

      // Update cache optimistically
      refetchEpisodes(
        { episodes: updatedEpisodes, total: Math.max(0, (episodesResponse?.total || 1) - 1), has_more: false },
        { revalidate: false }
      )

      // Revalidate after a short delay
      setTimeout(() => {
        refetchEpisodes()
      }, 1000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete episode'
      setActionError(errorMessage)
      throw error
    } finally {
      setActionLoading(false)
    }
  }, [episodes, episodesResponse, refetchEpisodes])

  const refetch = useCallback(() => {
    refetchEpisodes()
  }, [refetchEpisodes])

  return {
    episodes,
    loading,
    error,
    createEpisode,
    updateEpisode,
    deleteEpisode,
    refetch
  }
}

// =====================================================
// Hook for a specific episode
// =====================================================
export function useEpisode(episodeId: string | null): UseEpisodeReturn {
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Only fetch if episodeId is provided
  const {
    data: episode,
    error: fetchError,
    isLoading,
    mutate: refetchEpisode
  } = useSWR(
    episodeId ? `/narrative/episodes/${episodeId}` : null,
    episodeId ? () => episodesApi.get(episodeId) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  )

  const loading = isLoading || actionLoading
  const error = fetchError?.message || actionError

  const updateEpisode = useCallback(async (data: UpdateEpisodeRequest): Promise<Episode> => {
    if (!episodeId) throw new Error('No episode ID provided')

    setActionLoading(true)
    setActionError(null)

    try {
      const updatedEpisode = await episodesApi.update(episodeId, data)

      // Update the cache
      await refetchEpisode()

      return updatedEpisode
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update episode'
      setActionError(errorMessage)
      throw error
    } finally {
      setActionLoading(false)
    }
  }, [episodeId, refetchEpisode])

  const deleteEpisode = useCallback(async (): Promise<void> => {
    if (!episodeId) throw new Error('No episode ID provided')

    setActionLoading(true)
    setActionError(null)

    try {
      await episodesApi.delete(episodeId)

      // Clear the cache since episode is deleted
      refetchEpisode(undefined, { revalidate: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete episode'
      setActionError(errorMessage)
      throw error
    } finally {
      setActionLoading(false)
    }
  }, [episodeId, refetchEpisode])

  return {
    episode: episode || null,
    loading,
    error,
    updateEpisode,
    deleteEpisode,
    refetch: refetchEpisode
  }
}

// =====================================================
// Hook for quick episode creation with defaults
// =====================================================
export function useQuickEpisode(): UseQuickEpisodeReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createQuickEpisode = useCallback(async (data: {
    title?: string
    mood_emoji?: string
    reflection?: string
    date_range_days?: number
  }): Promise<Episode> => {
    setLoading(true)
    setError(null)

    try {
      const episode = await narrativeApi.createQuickEpisode(data)
      return episode
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create quick episode'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createQuickEpisode,
    loading,
    error
  }
}

// =====================================================
// Hook for episode analytics and insights
// =====================================================
export function useEpisodeAnalytics(episodes: Episode[]) {
  const analytics = {
    totalEpisodes: episodes.length,
    averageReflectionLength: episodes.reduce(
      (sum, ep) => sum + (ep.reflection?.length || 0), 0
    ) / Math.max(episodes.length, 1),

    moodDistribution: episodes.reduce((acc, ep) => {
      if (ep.mood_emoji) {
        acc[ep.mood_emoji] = (acc[ep.mood_emoji] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>),

    dateRange: episodes.length > 0 ? {
      earliest: episodes[episodes.length - 1]?.date_range_start,
      latest: episodes[0]?.date_range_end,
    } : null,

    recentActivity: episodes.slice(0, 5), // Last 5 episodes

    hasReflections: episodes.filter(ep => ep.reflection && ep.reflection.trim().length > 0).length,
    hasMoods: episodes.filter(ep => ep.mood_emoji).length,

    averageDaysPerEpisode: episodes.length > 1 ?
      episodes.reduce((sum, ep) => {
        const start = new Date(ep.date_range_start)
        const end = new Date(ep.date_range_end)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        return sum + days
      }, 0) / episodes.length : 0
  }

  return analytics
}
