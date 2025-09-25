import useSWR from 'swr'
import { strategyApi } from '../../lib/api/strategy'
import { useAITaskSync } from '../tasks/useAITaskSync'
import type { ApiStrategyDashboard } from '../../lib/api/strategy'
import type { StrategyDashboard, StrategySeason, Initiative, StrategyTask, StrategyAgent, StrategyMemory } from '../../lib/types/strategy'

// =====================================================
// API to Frontend Type Adapters
// =====================================================

function adaptApiSeasonToStrategy(apiSeason: ApiStrategyDashboard['active_season']): StrategySeason | null {
  if (!apiSeason) return null

  return {
    id: apiSeason.id,
    user_id: '', // Will be populated from context
    title: apiSeason.title,
    intention: apiSeason.intention,
    theme: apiSeason.theme as any, // API returns string, frontend expects specific themes
    status: 'active' as const,
    start_date: '',
    end_date: undefined,
    opening_ritual: {},
    metadata: {},
    created_at: '',
    updated_at: '',
    progress: apiSeason.progress,
    metric: apiSeason.intention,
    strategicTheme: apiSeason.theme,
    keyMetrics: [],
    quarterlyGoals: []
  }
}

function adaptApiInitiativeToFrontend(apiInitiative: ApiStrategyDashboard['active_initiatives'][0]): Initiative {
  return {
    id: apiInitiative.id,
    seasonId: '', // Will be populated from context
    title: apiInitiative.title,
    description: apiInitiative.description,
    progress: apiInitiative.progress,
    category: '', // Will need to be added to API response
    priority: apiInitiative.priority as any,
    status: apiInitiative.status as any,
    due_date: apiInitiative.due_date || undefined,
    tasks: [], // Will need to be fetched separately or included in API
    tags: [],
    created_at: '',
    updated_at: ''
  }
}

function adaptApiMemoryToStrategy(apiMemory: ApiStrategyDashboard['recent_memories'][0]): StrategyMemory {
  return {
    id: apiMemory.id,
    user_id: '',
    title: apiMemory.title,
    note: apiMemory.content,
    memory_type: 'thought' as const,
    captured_at: apiMemory.created_at,
    is_highlight: apiMemory.importance_level === 'high',
    source: 'manual' as const,
    importance_level: apiMemory.importance_level as 'low' | 'medium' | 'high',
    related_to: [],
    tags: [],
    status: 'active' as const,
    created_at: apiMemory.created_at,
    updated_at: apiMemory.created_at,
    strategyType: apiMemory.memory_type as any,
    impact: apiMemory.importance_level as any,
    actionable: true
  }
}

function adaptApiAgentWorkloadToAgent(apiAgent: ApiStrategyDashboard['agent_workload'][0]): StrategyAgent {
  return {
    id: apiAgent.agent_id,
    name: apiAgent.agent_name,
    description: '',
    status: 'online' as const,
    provider: 'anthropic' as const, // Default
    workload: {
      totalTasks: apiAgent.active_assignments + apiAgent.completed_assignments,
      inProgressTasks: apiAgent.active_assignments,
      completedToday: apiAgent.completed_assignments,
      estimatedHoursRemaining: apiAgent.active_assignments * 2 // Rough estimate
    },
    specialties: [],
    availability: apiAgent.active_assignments > 5 ? 'busy' : 'available'
  }
}

// =====================================================
// Main Dashboard Hook
// =====================================================

export function useStrategyDashboard(): {
  dashboard: StrategyDashboard | null
  loading: boolean
  error: string | null
  refetch: () => void
} {
  const { data, error, isLoading, mutate } = useSWR(
    '/strategy/dashboard',
    () => strategyApi.getDashboard(),
    {
      refreshInterval: 60000, // Refresh every 60 seconds (reduced from 30)
      revalidateOnFocus: false, // Disable focus revalidation to reduce calls
      errorRetryCount: 2, // Reduce retry attempts
      dedupingInterval: 10000 // Dedupe requests within 10 seconds
    }
  )

  // Transform API response to frontend types
  const dashboard: StrategyDashboard | null = data && typeof data === 'object' && 'active_season' in data ? {
    season: adaptApiSeasonToStrategy((data as ApiStrategyDashboard).active_season),
    initiatives: Array.isArray((data as ApiStrategyDashboard).active_initiatives) ? (data as ApiStrategyDashboard).active_initiatives.map(adaptApiInitiativeToFrontend) : [],
    myTasks: [], // These will come from separate API calls
    agentTasks: [], // These will come from separate API calls
    agents: Array.isArray((data as ApiStrategyDashboard).agent_workload) ? (data as ApiStrategyDashboard).agent_workload.map(adaptApiAgentWorkloadToAgent) : [],
    recentMemories: Array.isArray((data as ApiStrategyDashboard).recent_memories) ? (data as ApiStrategyDashboard).recent_memories.map(adaptApiMemoryToStrategy) : []
  } : null

  return {
    dashboard,
    loading: isLoading,
    error: error?.message || null,
    refetch: () => mutate()
  }
}

// =====================================================
// Enhanced Dashboard Hook with Tasks
// =====================================================

export function useStrategyDashboardWithTasks(): {
  dashboard: StrategyDashboard | null
  loading: boolean
  error: string | null
  refetch: () => void
} {
  // Get basic dashboard data
  const {
    dashboard: baseDashboard,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useStrategyDashboard()

  // Get strategic tasks separately
  const { data: tasksData, error: tasksError, isLoading: tasksLoading, mutate: mutateTasks } = useSWR(
    '/strategy/tasks',
    () => strategyApi.getStrategyTasks({ limit: 50 }),
    {
      refreshInterval: 60000, // Reduced from 30 seconds
      revalidateOnFocus: false, // Disable focus revalidation
      dedupingInterval: 10000 // Dedupe requests within 10 seconds
    }
  )

  const loading = dashboardLoading || tasksLoading
  const error = dashboardError || tasksError?.message || null

  // Enhance dashboard with tasks data
  const dashboard: StrategyDashboard | null = baseDashboard && tasksData && Array.isArray(tasksData) ? {
    ...baseDashboard,
    myTasks: tasksData
      .filter((task: any) => !task.assignee || task.assignee === 'me')
      .map(adaptApiTaskToStrategy),
    agentTasks: tasksData
      .filter((task: any) => task.assignee && task.assignee !== 'me')
      .map(adaptApiTaskToStrategy)
  } : baseDashboard

  // Set up AI task synchronization
  const allTasks = dashboard ? [...dashboard.myTasks, ...dashboard.agentTasks] : []
  useAITaskSync({
    strategyTasks: allTasks,
    onTaskUpdate: (taskId, updates) => {
      // This will trigger a refetch when AI task status changes
      mutateTasks()
    }
  })

  const refetch = () => {
    refetchDashboard()
    mutateTasks()
  }

  return {
    dashboard,
    loading,
    error,
    refetch
  }
}

// Helper function to adapt API tasks to frontend format
function adaptApiTaskToStrategy(apiTask: any): StrategyTask {
  return {
    id: apiTask.id,
    user_id: apiTask.user_id,
    title: apiTask.title,
    description: apiTask.description,
    status: apiTask.status,
    priority: apiTask.priority,
    progress: apiTask.progress,
    category: undefined, // Will need to be populated
    tags: apiTask.tags || [],
    assignee: apiTask.assignee,
    created_at: apiTask.created_at,
    updated_at: apiTask.updated_at,
    due_date: apiTask.due_date,
    completion_date: apiTask.completion_date,
    estimated_duration: apiTask.estimated_duration,
    notes: apiTask.description,
    initiativeId: apiTask.initiative_id,
    initiativeTitle: apiTask.initiative?.title,
    assignedAgent: apiTask.ai_delegation ? {
      id: apiTask.ai_delegation.ai_task_id,
      name: apiTask.ai_delegation.agent_name,
      description: '',
      status: 'online' as const,
      provider: 'anthropic' as const
    } : undefined,
    agentStatus: apiTask.ai_delegation ?
      (apiTask.ai_delegation.status === 'in_progress' ? 'working' : 'idle') : undefined
  }
}