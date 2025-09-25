// =====================================================
// Timeline Feature Hooks
// =====================================================

import useSWR from 'swr'
import { timelineApi } from '../api/timeline-api'
import type { TimelineData, UseTimelineReturn } from '../types/timeline'

export function useTimeline(selectedDate: Date): UseTimelineReturn {
  const dateKey = selectedDate.toISOString().split('T')[0]
  
  const { data, error, isLoading, mutate } = useSWR(
    `timeline-${dateKey}`,
    () => timelineApi.fetchTimelineData(selectedDate),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    timelineData: data || { items: [], totalDuration: 0, categories: [], tags: [] },
    isLoading,
    error,
    refetch: mutate,
  }
}

export function useTimelineRange(startDate: Date, endDate: Date) {
  const startKey = startDate.toISOString().split('T')[0]
  const endKey = endDate.toISOString().split('T')[0]
  
  const { data, error, isLoading, mutate } = useSWR(
    `timeline-range-${startKey}-${endKey}`,
    () => timelineApi.fetchTimelineRangeData(startDate, endDate),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  )

  return {
    timelineData: data || { items: [], totalDuration: 0, categories: [], tags: [] },
    isLoading,
    error,
    refetch: mutate,
  }
}
