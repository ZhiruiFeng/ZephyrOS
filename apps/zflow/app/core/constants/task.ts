// Task Management Constants (centralized)

export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold'
} as const

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
} as const

export const TASK_STATUS_OPTIONS = [
  { value: TASK_STATUS.PENDING, label: 'Todo' },
  { value: TASK_STATUS.IN_PROGRESS, label: 'In Progress' },
  { value: TASK_STATUS.COMPLETED, label: 'Completed' },
  { value: TASK_STATUS.ON_HOLD, label: 'On Hold' },
  { value: TASK_STATUS.CANCELLED, label: 'Cancelled' }
]

export const TASK_PRIORITY_OPTIONS = [
  { value: TASK_PRIORITY.LOW, label: 'Low' },
  { value: TASK_PRIORITY.MEDIUM, label: 'Medium' },
  { value: TASK_PRIORITY.HIGH, label: 'High' },
  { value: TASK_PRIORITY.URGENT, label: 'Urgent' }
]

export const VIEW_MODES = {
  LIST: 'list',
  GRID: 'grid',
  KANBAN: 'kanban'
} as const

export const VIEW_MODE_OPTIONS = [
  { value: VIEW_MODES.LIST, label: 'List' },
  { value: VIEW_MODES.GRID, label: 'Grid' },
  { value: VIEW_MODES.KANBAN, label: 'Kanban' }
]

// Color schemes for status and priority
export const STATUS_COLORS = {
  [TASK_STATUS.COMPLETED]: 'bg-green-100 text-green-800 border-green-200',
  [TASK_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800 border-blue-200',
  [TASK_STATUS.ON_HOLD]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [TASK_STATUS.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
  [TASK_STATUS.PENDING]: 'bg-gray-100 text-gray-800 border-gray-200'
}

export const PRIORITY_COLORS = {
  [TASK_PRIORITY.URGENT]: 'bg-red-100 text-red-800 border-red-200',
  [TASK_PRIORITY.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
  [TASK_PRIORITY.MEDIUM]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [TASK_PRIORITY.LOW]: 'bg-gray-100 text-gray-800 border-gray-200'
}

// Default task values
export const DEFAULT_TASK = {
  status: TASK_STATUS.PENDING,
  priority: TASK_PRIORITY.MEDIUM,
  progress: 0,
  tags: []
}

