import useSWR, { mutate } from 'swr'
import { apiClient } from '@/lib/api'

// Hook to fetch all activities
export function useActivitiesShared(
  params?: Parameters<typeof apiClient.getActivities>[0],
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled !== false
  const key = enabled ? (params ? `activities?${new URLSearchParams(params as any).toString()}` : 'activities') : null
  const { data, isLoading, error, mutate: refetch } = useSWR(
    key,
    () => apiClient.getActivities(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    activities: data || [],
    isLoading: enabled ? isLoading : false,
    error: enabled ? error : undefined,
    refetch,
  }
}

// Hook to fetch single activity
export function useActivity(id: string) {
  const { data, isLoading, error, mutate: refetch } = useSWR(
    id ? `activity-${id}` : null,
    () => apiClient.getActivity(id)
  )

  return {
    activity: data,
    isLoading,
    error,
    refetch,
  }
}

// Hook to create activity
export function useCreateActivity() {
  const createActivity = async (data: Parameters<typeof apiClient.createActivity>[0]) => {
    try {
      const newActivity = await apiClient.createActivity(data)
      // Optimistically update all activities queries
      await mutate((key) => typeof key === 'string' && key.startsWith('activities'), undefined, { revalidate: true })
      return newActivity
    } catch (error) {
      console.error('Failed to create activity:', error)
      throw error
    }
  }

  return { createActivity }
}

// Hook to update activity
export function useUpdateActivity() {
  const updateActivity = async (id: string, data: Parameters<typeof apiClient.updateActivity>[1]) => {
    try {
      const updatedActivity = await apiClient.updateActivity(id, data)
      // Update specific activity and all activities list
      await mutate(`activity-${id}`, updatedActivity, false)
      await mutate((key) => typeof key === 'string' && key.startsWith('activities'), undefined, { revalidate: true })
      return updatedActivity
    } catch (error) {
      console.error('Failed to update activity:', error)
      throw error
    }
  }

  return { updateActivity }
}

// Hook to delete activity
export function useDeleteActivity() {
  const deleteActivity = async (id: string) => {
    try {
      await apiClient.deleteActivity(id)
      // Remove from cache and update list
      await mutate(`activity-${id}`, undefined, false)
      await mutate((key) => typeof key === 'string' && key.startsWith('activities'), undefined, { revalidate: true })
    } catch (error) {
      console.error('Failed to delete activity:', error)
      throw error
    }
  }

  return { deleteActivity }
}

// Alias for backward compatibility
export const useActivities = useActivitiesShared