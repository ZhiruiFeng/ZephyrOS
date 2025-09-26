// Shared activity-related types

export interface BaseActivity {
  id: string
  title: string
  description?: string
  type: 'meeting' | 'focus' | 'break' | 'planning' | 'review' | 'communication'
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'scheduled'
  start_time: string
  end_time?: string
  estimated_duration_minutes?: number
  actual_duration_minutes?: number
  notes?: string
  energy_level?: number
  created_at: string
  updated_at: string
}

export interface ActivityProgress {
  activityId: string
  startTime: string
  endTime?: string
  estimatedDurationMinutes?: number
  progressPercentage: number
}

export interface ActivityOperationsReturn {
  activities: BaseActivity[]
  isLoading: boolean
  error: string | null
  createActivity: (data: Partial<BaseActivity>) => Promise<BaseActivity>
  updateActivity: (id: string, data: Partial<BaseActivity>) => Promise<BaseActivity>
  deleteActivity: (id: string) => Promise<void>
  refetch: () => void
}