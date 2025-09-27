/**
 * Activity utilities for ZFlow
 */

// Activity status colors
export const getActivityStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'paused':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'completed':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Activity type colors
export const getActivityTypeColor = (type: string) => {
  switch (type) {
    case 'meeting':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'focus':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200'
    case 'break':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'planning':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Format activity duration
export const formatActivityDuration = (durationMinutes: number): string => {
  if (durationMinutes < 60) {
    return `${durationMinutes}m`
  }

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

// Calculate activity progress percentage
export const calculateActivityProgress = (
  startTime: string | Date,
  endTime?: string | Date,
  estimatedDurationMinutes?: number
): number => {
  if (!estimatedDurationMinutes) return 0

  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()

  const elapsedMinutes = (end.getTime() - start.getTime()) / (1000 * 60)
  const progress = (elapsedMinutes / estimatedDurationMinutes) * 100

  return Math.min(100, Math.max(0, progress))
}

// Get activity status label
export const getActivityStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'active': 'Active',
    'paused': 'Paused',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'scheduled': 'Scheduled'
  }
  return statusMap[status] || status
}

// Get activity type label
export const getActivityTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'meeting': 'Meeting',
    'focus': 'Focus Work',
    'break': 'Break',
    'planning': 'Planning',
    'review': 'Review',
    'communication': 'Communication'
  }
  return typeMap[type] || type
}