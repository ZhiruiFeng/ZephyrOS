import type { Season } from '../../../zmemory/types/narrative'
import type { Task } from '../../app/types/task'
import type { Memory } from '../../app/types/memory'

// Define Agent type locally since it may not exist yet
export interface Agent {
  id: string
  name: string
  description: string
  status: 'online' | 'offline' | 'busy'
  model?: string
  provider: 'openai' | 'anthropic' | 'bedrock' | 'custom'
}

// =====================================================
// Strategy Types - Built on existing ZMemory structures
// =====================================================

// Strategy Season extends existing Season from zmemory
export interface StrategySeason extends Season {
  // Computed frontend fields
  progress?: number // 0-100, calculated from initiatives
  metric?: string   // extracted from metadata or intention

  // Strategy-specific metadata extensions
  strategicTheme?: string
  keyMetrics?: string[]
  quarterlyGoals?: string[]
}

// Initiative is a special type of task with strategic importance
export interface Initiative {
  id: string
  seasonId: string
  title: string
  description?: string
  progress: number // 0-100, computed from subtasks

  // Derived from Task data
  category?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  due_date?: string

  // Relations
  tasks: StrategyTask[] // tasks under this initiative

  // Metadata
  tags: string[]
  created_at: string
  updated_at: string
}

// Strategy Task extends existing Task with strategic context
export interface StrategyTask extends Task {
  // Add strategic context
  initiativeId?: string
  initiativeTitle?: string

  // Timeline task integration
  timelineTaskId?: string

  // Agent assignment for delegation
  assignedAgent?: Agent
  agentStatus?: 'idle' | 'working' | 'blocked'
  aiTaskId?: string
}

// Strategic Memory for reflections and insights
export interface StrategyMemory extends Memory {
  // Categorize strategic thoughts
  strategyType?: 'reflection' | 'insight' | 'goal' | 'lesson' | 'idea'
  seasonId?: string
  initiativeId?: string

  // Strategic metadata
  impact?: 'low' | 'medium' | 'high'
  actionable?: boolean
}

// Agent with strategic workload context
export interface StrategyAgent extends Agent {
  // Computed workload info
  workload?: {
    totalTasks: number
    inProgressTasks: number
    completedToday: number
    estimatedHoursRemaining: number
  }

  // Strategic context
  specialties?: string[]
  currentFocus?: string
  availability?: 'available' | 'busy' | 'offline'
}

// =====================================================
// API Response Types
// =====================================================

export interface StrategyDashboard {
  season: StrategySeason | null
  initiatives: Initiative[]
  myTasks: StrategyTask[]
  agentTasks: StrategyTask[]
  agents: StrategyAgent[]
  recentMemories: StrategyMemory[]
}

export interface InitiativeProgress {
  initiativeId: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  progressPercentage: number
  estimatedCompletion?: string
}

export interface AgentWorkloadSummary {
  agentId: string
  agentName: string
  totalAssignedTasks: number
  activeTasksCount: number
  completedTasksToday: number
  averageTaskDuration: number
  currentCapacity: 'low' | 'medium' | 'high' | 'overloaded'
}

// =====================================================
// UI Component Types
// =====================================================

export type StrategyLens = 'vision' | 'execution' | 'delegation' | 'reflection'

export interface StrategyPageState {
  activeLens: StrategyLens
  selectedInitiative?: string
  selectedAgent?: string
  scratchpadContent: string
  whatIfMode: boolean
}

export interface WhatIfScenario {
  name: string
  description: string
  changes: {
    dropInitiatives?: string[]
    reallocateResources?: { from: string; to: string; percentage: number }[]
    addResources?: { initiativeId: string; additionalHours: number }[]
  }
  results: {
    newProgress: Record<string, number>
    timeToCompletion: Record<string, string>
    riskFactors: string[]
  }
}

// =====================================================
// Form Types
// =====================================================

export interface CreateInitiativeForm {
  title: string
  description: string
  seasonId: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  tags: string[]
}

export interface StrategyReflectionForm {
  content: string
  strategyType: 'reflection' | 'insight' | 'goal' | 'lesson' | 'idea'
  seasonId?: string
  initiativeId?: string
  impact: 'low' | 'medium' | 'high'
  actionable: boolean
  tags: string[]
}

export interface TaskDelegationForm {
  taskId: string
  agentId: string
  briefing: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedHours?: number
}

// =====================================================
// Hook Return Types
// =====================================================

export interface UseStrategySeasonReturn {
  season: StrategySeason | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export interface UseInitiativesReturn {
  initiatives: Initiative[]
  loading: boolean
  error: string | null
  createInitiative: (data: CreateInitiativeForm) => Promise<Initiative>
  updateInitiative: (id: string, data: Partial<Initiative>) => Promise<Initiative>
  deleteInitiative: (id: string) => Promise<void>
  refetch: () => void
}

export interface UseStrategyTasksReturn {
  myTasks: StrategyTask[]
  agentTasks: StrategyTask[]
  loading: boolean
  error: string | null
  createTask: (data: any) => Promise<StrategyTask>
  updateTask: (id: string, data: Partial<StrategyTask>) => Promise<StrategyTask>
  delegateTask: (taskId: string, agentId: string, briefing: string) => Promise<StrategyTask>
  promoteTimelineTaskToStrategy: (timelineTaskId: string, initiativeId: string) => Promise<StrategyTask>
  refetch: () => void
}

export interface UseStrategyAgentsReturn {
  agents: StrategyAgent[]
  loading: boolean
  error: string | null
  sendBrief: (agentId: string, content: string) => Promise<void>
  refetch: () => void
}

export interface UseStrategyMemoriesReturn {
  memories: StrategyMemory[]
  loading: boolean
  error: string | null
  createReflection: (data: StrategyReflectionForm) => Promise<StrategyMemory>
  refetch: () => void
}

// =====================================================
// Constants and Utilities
// =====================================================

export const STRATEGY_LENS_CONFIG = {
  vision: {
    title: 'Vision',
    description: 'See top initiatives and their alignment with the season goal',
    icon: 'Eye'
  },
  execution: {
    title: 'Execution',
    description: 'Your current workload at a glance',
    icon: 'ClipboardCheck'
  },
  delegation: {
    title: 'AI Delegation',
    description: 'Monitor agent capacity and queue',
    icon: 'Bot'
  },
  reflection: {
    title: 'Reflection',
    description: 'Capture insights to fuel strategy updates',
    icon: 'Lightbulb'
  }
} as const

export const STRATEGY_TAGS = [
  'initiative',
  'strategic',
  'quarterly-goal',
  'key-result',
  'milestone',
  'reflection',
  'learning',
  'insight'
] as const

export const INITIATIVE_PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'red' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'low', label: 'Low', color: 'gray' }
] as const

// =====================================================
// Type Guards
// =====================================================

export function isStrategyTask(task: Task): task is StrategyTask {
  return task.tags?.some(tag => STRATEGY_TAGS.includes(tag as any)) || false
}

export function isInitiative(task: Task): boolean {
  return task.tags?.includes('initiative') || false
}

export function isStrategyMemory(memory: Memory): memory is StrategyMemory {
  return memory.tags?.some(tag => STRATEGY_TAGS.includes(tag as any)) || false
}