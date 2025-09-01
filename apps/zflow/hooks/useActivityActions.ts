import { useCallback } from 'react'
import { useCreateActivity, useUpdateActivity, useDeleteActivity } from './useActivities'

interface UseActivityActionsProps {
  t: any // translations
}

export function useActivityActions({ t }: UseActivityActionsProps) {
  const { createActivity } = useCreateActivity()
  const { updateActivity } = useUpdateActivity()
  const { deleteActivity } = useDeleteActivity()

  // Toggle activity completion
  const toggleActivityComplete = useCallback(async (activityId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'active' : 'completed'
      await updateActivity(activityId, { status: newStatus })
    } catch (error) {
      console.error('Failed to toggle activity status:', error)
    }
  }, [updateActivity])

  // Delete activity with confirmation
  const handleDeleteActivity = useCallback(async (activityId: string) => {
    if (confirm(t.activity?.confirmDelete || '确定要删除这个活动吗？')) {
      try {
        await deleteActivity(activityId)
      } catch (error) {
        console.error('Failed to delete activity:', error)
      }
    }
  }, [deleteActivity, t])

  // Save activity changes
  const handleSaveActivity = useCallback(async (activityId: string, updates: any) => {
    try {
      await updateActivity(activityId, updates)
    } catch (error) {
      console.error('Failed to save activity:', error)
      throw error
    }
  }, [updateActivity])

  return {
    toggleActivityComplete,
    handleDeleteActivity,
    handleSaveActivity,
    createActivity,
    updateActivity
  }
}