// =====================================================
// Strategy Feature - Public API
// =====================================================

// Strategy Hooks
export { useDailyStrategy } from './hooks/useDailyStrategy'
export { useStrategyTasks } from './hooks/useStrategyTasks'
export { useStrategyMemories } from './hooks/useStrategyMemories'
export { useStrategyAgents } from './hooks/useStrategyAgents'
export { useSeason } from './hooks/useSeason'
export { useSeasons } from './hooks/useSeasons'
export { useDailyPlanning } from './hooks/useDailyPlanning'
export { useStrategyDashboard } from './hooks/useStrategyDashboard'
export { useInitiatives } from './hooks/useInitiatives'
export { useCreateInitiative } from './hooks/useCreateInitiative'

// Strategy API
export { strategyApi } from './api/strategy-api'
export { dailyStrategyApi } from './api/daily-strategy-api'

// Strategy API Types
export type { ApiInitiative, ApiStrategyDashboard } from './api/strategy-api'

// Daily Strategy API Types
export type {
  StrategyType,
  DailyStrategyStatus,
  ImportanceLevel,
  PlannedTimeOfDay,
  MoodImpact,
  DailyStrategyItem,
  DailyStrategyItemWithDetails,
  CreateDailyStrategyRequest,
  UpdateDailyStrategyRequest,
  DailyStrategyOverview,
  DailyStrategyQuery,
  UpdateDailyStrategyStatusRequest
} from './api/daily-strategy-api'

// Hook types
export type { DailyStrategyData } from './hooks/useDailyStrategy'

// Strategy Types (re-export key types)
export type {
  StrategySeason,
  Initiative,
  StrategyTask,
  StrategyMemory,
  StrategyAgent,
  StrategyDashboard,
  StrategyLens,
  WhatIfScenario,
  CreateInitiativeForm,
  StrategyReflectionForm,
  TaskDelegationForm,
  UseStrategySeasonReturn,
  UseInitiativesReturn,
  UseStrategyTasksReturn,
  UseStrategyAgentsReturn,
  UseStrategyMemoriesReturn
} from './types/strategy'

// Strategy Components (re-export main components)
export { default as StrategyPage } from './StrategyPage'

// Component Types
export type { ReflectionType } from './components/modals/ReflectionTypeSelector'

// Strategy Utilities
export {
  adaptSeasonToStrategy,
  adaptTaskToStrategy,
  adaptMemoryToStrategy,
  adaptAgentToStrategy
} from './utils/strategy'

// Strategy Mocks
export {
  generateWhatIfScenarios,
  generateStrategicInsights,
  generateMockInitiatives,
  generateMockStrategicTasks
} from './mocks/strategy'

// Strategy Constants
export {
  STRATEGY_LENS_CONFIG,
  STRATEGY_TAGS,
  INITIATIVE_PRIORITIES
} from './types/strategy'