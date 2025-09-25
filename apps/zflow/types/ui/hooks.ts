// =====================================================
// Hook Return Types - Unified
// =====================================================

import type { Task, Category, TaskStats } from '../domain/task'
import type { Memory, MemorySearchResult, MemoryListState } from '../domain/memory'
import type { Agent } from '../domain/agent'

// Task hooks
export interface UseTaskFilteringReturn {
  filteredTasks: Task[]
  currentView: 'current' | 'future' | 'archive'
  setCurrentView: (view: 'current' | 'future' | 'archive') => void
  totalCount: number
  stats: TaskStats
}

export interface UseTaskActionsReturn {
  createTask: (task: Partial<Task>) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  duplicateTask: (id: string) => Promise<Task>
}

// Memory hooks
export interface UseMemoriesReturn {
  memories: Memory[]
  loading: boolean
  error: string | null
  searchMemories: (query: string) => Promise<MemorySearchResult>
  createMemory: (memory: Partial<Memory>) => Promise<Memory>
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<Memory>
  deleteMemory: (id: string) => Promise<void>
  state: MemoryListState
}

// Category hooks
export interface UseCategoriesReturn {
  categories: Category[]
  loading: boolean
  error: string | null
  createCategory: (category: Partial<Category>) => Promise<Category>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
}

// Agent hooks
export interface UseAIAgentsReturn {
  agents: Agent[]
  loading: boolean
  error: string | null
  createAgent: (agent: Partial<Agent>) => Promise<Agent>
  updateAgent: (id: string, updates: Partial<Agent>) => Promise<Agent>
  deleteAgent: (id: string) => Promise<void>
}

// Timer hooks
export interface UseTimerReturn {
  isRunning: boolean
  runningTaskId?: string
  elapsedMs: number
  start: (taskId: string) => Promise<void>
  stop: (taskId: string) => Promise<void>
  refresh: () => void
}

// Activity hooks
export interface UseActivitiesReturn {
  activities: any[] // TODO: Define Activity type
  loading: boolean
  error: string | null
  createActivity: (activity: any) => Promise<any>
  updateActivity: (id: string, updates: any) => Promise<any>
  deleteActivity: (id: string) => Promise<void>
}

// Strategy hooks (from lib/types/strategy.ts)
export interface UseStrategySeasonReturn {
  currentSeason: any // StrategySeason type
  seasons: any[]
  loading: boolean
  error: string | null
}

export interface UseInitiativesReturn {
  initiatives: any[] // Initiative type
  loading: boolean
  error: string | null
  createInitiative: (initiative: any) => Promise<any>
  updateInitiative: (id: string, updates: any) => Promise<any>
  deleteInitiative: (id: string) => Promise<void>
}

export interface UseStrategyTasksReturn {
  tasks: any[] // StrategyTask type
  loading: boolean
  error: string | null
  createTask: (task: any) => Promise<any>
  updateTask: (id: string, updates: any) => Promise<any>
  deleteTask: (id: string) => Promise<void>
}