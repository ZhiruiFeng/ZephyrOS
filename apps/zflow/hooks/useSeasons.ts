import useSWR from 'swr'
import { useState, useCallback } from 'react'
import { narrativeApiClient } from '../lib/narrative-api'
import type {
  Season,
  SeasonWithEpisodes,
  CreateSeasonRequest,
  UpdateSeasonRequest,
  UseSeasonsReturn
} from '../types/narrative'

// =====================================================
// SWR Keys for caching
// =====================================================
const SEASONS_KEY = '/narrative/seasons'
const CURRENT_SEASON_KEY = '/narrative/seasons/current'

// =====================================================
// Custom hook for managing seasons
// =====================================================
export function useSeasons(): UseSeasonsReturn {
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Fetch all seasons
  const {
    data: seasonsResponse,
    error: fetchError,
    isLoading,
    mutate: refetchSeasons
  } = useSWR(SEASONS_KEY, () => narrativeApiClient.seasons.list(), {
    revalidateOnFocus: false,
    dedupingInterval: 30000 // 30 seconds
  })

  // Fetch current active season
  const {
    data: currentSeason,
    mutate: refetchCurrentSeason
  } = useSWR(CURRENT_SEASON_KEY, () => narrativeApiClient.seasons.getCurrent(), {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
    errorRetryCount: 1 // Don't retry much since no active season is common
  })

  // Combined loading state
  const loading = isLoading || actionLoading

  // Combined error state
  const error = fetchError?.message || actionError

  // Get seasons array
  const seasons = seasonsResponse?.seasons || []

  // =====================================================
  // Action functions with optimistic updates
  // =====================================================

  const createSeason = useCallback(async (data: CreateSeasonRequest): Promise<Season> => {
    setActionLoading(true)
    setActionError(null)

    try {
      const newSeason = await narrativeApiClient.seasons.create(data)

      // Optimistically update the cache
      await refetchSeasons()
      await refetchCurrentSeason()

      return newSeason
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create season'
      setActionError(errorMessage)
      throw error
    } finally {
      setActionLoading(false)
    }
  }, [refetchSeasons, refetchCurrentSeason])

  const updateSeason = useCallback(async (id: string, data: UpdateSeasonRequest): Promise<Season> => {
    setActionLoading(true)
    setActionError(null)

    try {
      const updatedSeason = await narrativeApiClient.seasons.update(id, data)

      // Optimistically update the cache
      const updatedSeasons = seasons.map(season =>
        season.id === id ? updatedSeason : season
      )

      // Update seasons cache
      await refetchSeasons()

      // Update current season cache if this was the active season
      if (updatedSeason.status === 'active' || currentSeason?.id === id) {
        await refetchCurrentSeason()
      }

      return updatedSeason
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update season'
      setActionError(errorMessage)
      throw error
    } finally {
      setActionLoading(false)
    }
  }, [seasons, currentSeason, refetchSeasons, refetchCurrentSeason])

  const deleteSeason = useCallback(async (id: string): Promise<void> => {
    setActionLoading(true)
    setActionError(null)

    try {
      await narrativeApiClient.seasons.delete(id)

      // Optimistically update the cache
      await refetchSeasons()

      // Update current season if it was deleted
      if (currentSeason?.id === id) {
        await refetchCurrentSeason()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete season'
      setActionError(errorMessage)
      throw error
    } finally {
      setActionLoading(false)
    }
  }, [currentSeason, refetchSeasons, refetchCurrentSeason])

  const refetch = useCallback(() => {
    refetchSeasons()
    refetchCurrentSeason()
  }, [refetchSeasons, refetchCurrentSeason])

  return {
    seasons,
    activeSeason: currentSeason || null,
    loading,
    error,
    createSeason,
    updateSeason,
    deleteSeason,
    refetch
  }
}

// =====================================================
// Hook for a specific season with episodes
// =====================================================
export function useSeason(seasonId: string | null, includeEpisodes = true) {
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Only fetch if seasonId is provided
  const {
    data: season,
    error: fetchError,
    isLoading,
    mutate: refetchSeason
  } = useSWR(
    seasonId ? `/narrative/seasons/${seasonId}` : null,
    seasonId ? () => narrativeApiClient.seasons.get(seasonId, includeEpisodes) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  )

  const loading = isLoading || actionLoading
  const error = fetchError?.message || actionError

  const updateSeason = useCallback(async (data: UpdateSeasonRequest): Promise<Season> => {
    if (!seasonId) throw new Error('No season ID provided')

    setActionLoading(true)
    setActionError(null)

    try {
      const updatedSeason = await narrativeApiClient.seasons.update(seasonId, data)

      // Update the cache
      await refetchSeason()

      return updatedSeason
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update season'
      setActionError(errorMessage)
      throw error
    } finally {
      setActionLoading(false)
    }
  }, [seasonId, refetchSeason])

  return {
    season: season as SeasonWithEpisodes | null,
    loading,
    error,
    updateSeason,
    refetch: refetchSeason
  }
}

// =====================================================
// Hook for season statistics and quick actions
// =====================================================
export function useSeasonStats() {
  const { seasons, activeSeason } = useSeasons()

  const stats = {
    totalSeasons: seasons.length,
    activeSeasonCount: seasons.filter(s => s.status === 'active').length,
    completedSeasonCount: seasons.filter(s => s.status === 'completed').length,
    pausedSeasonCount: seasons.filter(s => s.status === 'paused').length,
    hasActiveSeason: !!activeSeason,
    themeDistribution: seasons.reduce((acc, season) => {
      acc[season.theme] = (acc[season.theme] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return stats
}