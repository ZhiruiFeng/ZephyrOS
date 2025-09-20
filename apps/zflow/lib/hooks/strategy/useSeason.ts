import useSWR from 'swr'
import { authJsonFetcher } from '../../utils/auth-fetcher'
import { adaptSeasonToStrategy } from '../../adapters/strategy'
import type { UseStrategySeasonReturn } from '../../types/strategy'
import type { Season } from '../../../../zmemory/types/narrative'

const ZMEMORY_API_BASE = 'http://localhost:3001/api'

export function useSeason(): UseStrategySeasonReturn {
  const { data, error, mutate } = useSWR<Season>(
    `${ZMEMORY_API_BASE}/narrative/seasons/current`,
    authJsonFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
      onError: (error) => {
        console.error('Error fetching current season:', error)
      }
    }
  )

  const season = data ? adaptSeasonToStrategy(data) : null

  return {
    season,
    loading: !data && !error,
    error: error?.message || null,
    refetch: () => mutate()
  }
}

export function useSeasons() {
  const { data, error, mutate } = useSWR<{ seasons: Season[] }>(
    `${ZMEMORY_API_BASE}/narrative/seasons`,
    authJsonFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  )

  const seasons = data?.seasons?.map(adaptSeasonToStrategy) || []

  return {
    seasons,
    loading: !data && !error,
    error: error?.message || null,
    refetch: () => mutate()
  }
}