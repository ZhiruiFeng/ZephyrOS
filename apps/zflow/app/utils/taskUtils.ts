import { Task } from '../types/task'

// Get status color
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Get priority color
export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

// Check if overdue
export const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false
  const due = new Date(dueDate).getTime()
  const now = Date.now()
  return due < now
}

// Get display date for a task (completion_date for completed tasks, due_date for others)
export const getTaskDisplayDate = (status: string, dueDate?: string, completionDate?: string) => {
  if (status === 'completed' && completionDate) {
    return completionDate
  }
  return dueDate
}

// Check if task should show overdue indicator (never for completed tasks)
export const shouldShowOverdue = (status: string, dueDate?: string) => {
  if (status === 'completed') return false
  return isOverdue(dueDate)
}

// Format date
export const formatDate = (date: string, locale: string = 'en-US') => {
  return new Date(date).toLocaleDateString(locale)
}

// Format date时间
export const formatDateTime = (date: string, locale: string = 'en-US') => {
  return new Date(date).toLocaleString(locale)
}

// Process tags array
export const processTags = (tags: string[] = [], excludeTags: string[] = ['zflow', 'task']) => {
  return tags.filter(tag => !excludeTags.includes(tag))
}

// Convert tags string to array
export const parseTagsString = (tagsString: string): string[] => {
  return tagsString
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
}

// Convert tags array to string
export const formatTagsString = (tags: string[] = [], excludeTags: string[] = ['zflow', 'task']): string => {
  return processTags(tags, excludeTags).join(', ')
}

// Get task status English name
export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'Todo',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'on_hold': 'On Hold'
  }
  return statusMap[status] || status
}

// Get priority English name
export const getPriorityLabel = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    'urgent': 'Urgent',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low'
  }
  return priorityMap[priority] || priority
}
