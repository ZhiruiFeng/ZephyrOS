// Shared task-related types

export interface BaseTask {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  estimated_duration?: number
  progress?: number
  assignee?: string
  completion_date?: string
  notes?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface TaskWithCategory extends BaseTask {
  category?: {
    id: string
    name: string
    color?: string
  }
  category_id?: string
}

export interface TaskInfo {
  title: string
  description: string
  status: string
  priority: string
  progress: number
  due_date: string
  estimated_duration: number
  assignee: string
  tags: string[]
}

export interface TaskOperationsReturn {
  saveTask: (taskId: string, data: any) => Promise<any>
  saveTaskSilent: (taskId: string, data: any) => Promise<any>
  updateNotes: (taskId: string, notes: string) => Promise<any>
  updateNotesSilent: (taskId: string, notes: string) => Promise<any>
  updateStatus: (taskId: string, status: string) => Promise<any>
  toggleComplete: (taskId: string, currentStatus: string) => Promise<any>
  updatePriority: (taskId: string, priority: string) => Promise<any>
  updateProgress: (taskId: string, progress: number) => Promise<any>
  convertTaskForEdit: (task: any) => any
}