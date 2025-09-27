// Task Feature Types
export type ViewKey = 'current' | 'future' | 'archive'
export type DisplayMode = 'list' | 'grid'

export interface TaskFormValue {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  categoryId: string
  dueDate: string
  tags: string
  joinAttention: boolean
}

export interface TaskViewProps {
  tasks: any[]
  categories: any[]
  timer: any
  displayMode: DisplayMode
  expandedDescriptions: Set<string>
  t: any
  onTaskClick: (taskId: string) => void
  onEditTask: (task: any) => void
  onDeleteTask: (taskId: string) => void
  onShowTime: (task: { id: string; title: string }) => void
  onToggleDescription: (taskId: string) => void
}

export interface CurrentViewProps extends TaskViewProps {
  onToggleComplete: (taskId: string, currentStatus: string) => void
  onHoldTask: (taskId: string) => void
}

export interface FutureViewProps extends TaskViewProps {
  onActivateTask: (taskId: string) => void
  onUpdateCategory: (taskId: string, categoryId: string | undefined) => void
}

export interface ArchiveViewProps extends Omit<TaskViewProps, 'tasks'> {
  groupedArchiveList: Array<{ date: string; tasks: any[] }>
  onReopenTask: (taskId: string) => void
}
