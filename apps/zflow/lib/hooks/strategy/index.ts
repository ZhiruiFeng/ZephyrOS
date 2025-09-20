// Strategy hooks exports
export { useSeason, useSeasons } from './useSeason'
export { useInitiatives } from './useInitiatives'
export { useStrategyTasks } from './useStrategyTasks'
export { useStrategyAgents, useAgentStatus } from './useStrategyAgents'
export { useStrategyMemories, useWeeklyReview } from './useStrategyMemories'

// Combined dashboard hook
import { useSeason } from './useSeason'
import { useInitiatives } from './useInitiatives'
import { useStrategyTasks } from './useStrategyTasks'
import { useStrategyAgents } from './useStrategyAgents'
import { useStrategyMemories } from './useStrategyMemories'
import { adaptToStrategyDashboard } from '../../adapters/strategy'
import type { StrategyDashboard } from '../../types/strategy'

export function useStrategyDashboard(seasonId?: string): {
  dashboard: StrategyDashboard | null
  loading: boolean
  error: string | null
  refetch: () => void
} {
  const { season, loading: seasonLoading, error: seasonError, refetch: refetchSeason } = useSeason()
  const { initiatives, loading: initiativesLoading, error: initiativesError, refetch: refetchInitiatives } = useInitiatives(seasonId)
  const { myTasks, agentTasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useStrategyTasks(seasonId)
  const { agents, loading: agentsLoading, error: agentsError, refetch: refetchAgents } = useStrategyAgents()
  const { memories, loading: memoriesLoading, error: memoriesError, refetch: refetchMemories } = useStrategyMemories(seasonId)

  const loading = seasonLoading || initiativesLoading || tasksLoading || agentsLoading || memoriesLoading
  const error = seasonError || initiativesError || tasksError || agentsError || memoriesError

  const dashboard: StrategyDashboard | null = (!loading && !error) ? {
    season,
    initiatives,
    myTasks,
    agentTasks,
    agents,
    recentMemories: memories
  } : null

  const refetch = () => {
    refetchSeason()
    refetchInitiatives()
    refetchTasks()
    refetchAgents()
    refetchMemories()
  }

  return {
    dashboard,
    loading,
    error,
    refetch
  }
}