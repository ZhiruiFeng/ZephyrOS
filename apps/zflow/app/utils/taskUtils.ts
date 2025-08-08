import { Task } from '../types/task'

// 获取状态颜色
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

// 获取优先级颜色
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

// 检查是否逾期
export const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false
  const due = new Date(dueDate).getTime()
  const now = Date.now()
  return due < now
}

// 格式化日期
export const formatDate = (date: string, locale: string = 'zh-CN') => {
  return new Date(date).toLocaleDateString(locale)
}

// 格式化日期时间
export const formatDateTime = (date: string, locale: string = 'zh-CN') => {
  return new Date(date).toLocaleString(locale)
}

// 处理标签数组
export const processTags = (tags: string[] = [], excludeTags: string[] = ['zflow', 'task']) => {
  return tags.filter(tag => !excludeTags.includes(tag))
}

// 将标签字符串转换为数组
export const parseTagsString = (tagsString: string): string[] => {
  return tagsString
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
}

// 将标签数组转换为字符串
export const formatTagsString = (tags: string[] = [], excludeTags: string[] = ['zflow', 'task']): string => {
  return processTags(tags, excludeTags).join(', ')
}

// 获取任务状态的中文名称
export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '待办',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '取消',
    'on_hold': '搁置'
  }
  return statusMap[status] || status
}

// 获取优先级的中文名称
export const getPriorityLabel = (priority: string): string => {
  const priorityMap: Record<string, string> = {
    'urgent': '紧急',
    'high': '高',
    'medium': '中',
    'low': '低'
  }
  return priorityMap[priority] || priority
}
