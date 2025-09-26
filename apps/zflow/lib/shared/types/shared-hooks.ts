// Common hook return types and interfaces

export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export interface CRUDHookReturn<T> extends LoadingState {
  data: T[]
  create: (item: Partial<T>) => Promise<T>
  update: (id: string, item: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<void>
  refetch: () => void
}

export interface SingleItemHookReturn<T> extends LoadingState {
  data: T | null
  refetch: () => void
}

export interface TimerHookReturn {
  isRunning: boolean
  runningTaskId?: string
  runningTimelineItemId?: string
  elapsedMs: number
  start: (taskId: string, opts?: { autoSwitch?: boolean }) => Promise<void>
  stop: (taskId: string, opts?: { overrideEndAt?: string }) => Promise<void>
  startActivity: (activityId: string) => Promise<void>
  stopActivity: (activityId: string) => Promise<void>
  refresh: () => void
}

export interface AutoSaveHookReturn {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  lastSaved: Date | null
  triggerAutoSave: () => void
  cancelAutoSave: () => void
  forceAutoSave: () => Promise<void>
  resetAutoSave: () => void
}