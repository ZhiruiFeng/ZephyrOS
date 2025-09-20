import type {
  StrategySeason,
  Initiative,
  StrategyTask,
  StrategyAgent,
  WhatIfScenario,
  InitiativeProgress,
  AgentWorkloadSummary
} from '../types/strategy'

// =====================================================
// What-If Simulation Engine (Frontend Only)
// =====================================================

export function runWhatIfScenario(
  initiatives: Initiative[],
  scenario: WhatIfScenario
): WhatIfScenario {
  const { changes } = scenario

  // Create a copy of initiatives to simulate changes
  let simulatedInitiatives = [...initiatives]

  // Apply changes
  if (changes.dropInitiatives) {
    simulatedInitiatives = simulatedInitiatives.filter(
      init => !changes.dropInitiatives!.includes(init.id)
    )
  }

  // Calculate resource reallocation
  const newProgress: Record<string, number> = {}
  const timeToCompletion: Record<string, string> = {}
  const riskFactors: string[] = []

  if (changes.reallocateResources) {
    changes.reallocateResources.forEach(reallocation => {
      const fromInitiative = simulatedInitiatives.find(i => i.id === reallocation.from)
      const toInitiative = simulatedInitiatives.find(i => i.id === reallocation.to)

      if (fromInitiative && toInitiative) {
        const resourcesFreed = fromInitiative.progress * (reallocation.percentage / 100)
        const newFromProgress = Math.max(0, fromInitiative.progress - resourcesFreed)
        const newToProgress = Math.min(100, toInitiative.progress + resourcesFreed)

        newProgress[fromInitiative.id] = Math.round(newFromProgress)
        newProgress[toInitiative.id] = Math.round(newToProgress)

        if (newFromProgress < 25) {
          riskFactors.push(`${fromInitiative.title} may become severely delayed`)
        }
      }
    })
  }

  // Apply additional resources
  if (changes.addResources) {
    changes.addResources.forEach(addition => {
      const initiative = simulatedInitiatives.find(i => i.id === addition.initiativeId)
      if (initiative) {
        const currentProgress = newProgress[initiative.id] ?? initiative.progress
        const progressBoost = Math.min(20, addition.additionalHours / 8) // 1 day of work = ~2.5% boost
        newProgress[initiative.id] = Math.min(100, Math.round(currentProgress + progressBoost))
      }
    })
  }

  // Calculate time to completion estimates
  simulatedInitiatives.forEach(initiative => {
    const currentProgress = newProgress[initiative.id] ?? initiative.progress
    const remainingProgress = 100 - currentProgress

    if (remainingProgress <= 0) {
      timeToCompletion[initiative.id] = 'Completed'
    } else {
      const estimatedDays = Math.ceil(remainingProgress / 5) // Assume 5% progress per day
      const completionDate = new Date()
      completionDate.setDate(completionDate.getDate() + estimatedDays)
      timeToCompletion[initiative.id] = completionDate.toLocaleDateString()
    }
  })

  // Add general risk factors
  if (changes.dropInitiatives && changes.dropInitiatives.length > 0) {
    riskFactors.push('Dropping initiatives may affect long-term strategic alignment')
  }

  const overloadedInitiatives = simulatedInitiatives.filter(
    i => (newProgress[i.id] ?? i.progress) > 90
  )
  if (overloadedInitiatives.length > 2) {
    riskFactors.push('Multiple initiatives nearing completion may strain resources')
  }

  return {
    ...scenario,
    results: {
      newProgress,
      timeToCompletion,
      riskFactors
    }
  }
}

// =====================================================
// Pre-built What-If Scenarios
// =====================================================

export function generateWhatIfScenarios(initiatives: Initiative[]): WhatIfScenario[] {
  if (initiatives.length < 2) {
    return []
  }

  const scenarios: WhatIfScenario[] = []

  // Scenario 1: Drop lowest progress initiative
  const lowestProgress = initiatives.reduce((min, init) =>
    init.progress < min.progress ? init : min
  )

  scenarios.push({
    name: 'Focus Mode',
    description: `Drop "${lowestProgress.title}" and reallocate resources to top priorities`,
    changes: {
      dropInitiatives: [lowestProgress.id],
      reallocateResources: initiatives
        .filter(i => i.id !== lowestProgress.id)
        .slice(0, 2)
        .map(i => ({
          from: lowestProgress.id,
          to: i.id,
          percentage: 30
        }))
    },
    results: { newProgress: {}, timeToCompletion: {}, riskFactors: [] }
  })

  // Scenario 2: Even resource distribution
  const avgProgress = initiatives.reduce((sum, i) => sum + i.progress, 0) / initiatives.length
  const reallocations = initiatives
    .filter(i => i.progress > avgProgress + 10)
    .slice(0, 1)
    .flatMap(highInit =>
      initiatives
        .filter(i => i.progress < avgProgress - 10)
        .slice(0, 2)
        .map(lowInit => ({
          from: highInit.id,
          to: lowInit.id,
          percentage: 15
        }))
    )

  if (reallocations.length > 0) {
    scenarios.push({
      name: 'Balanced Approach',
      description: 'Redistribute resources for more even progress across initiatives',
      changes: { reallocateResources: reallocations },
      results: { newProgress: {}, timeToCompletion: {}, riskFactors: [] }
    })
  }

  // Scenario 3: Sprint to completion
  const nearCompletion = initiatives.filter(i => i.progress > 70)
  if (nearCompletion.length > 0) {
    scenarios.push({
      name: 'Sprint to Completion',
      description: 'Add extra resources to initiatives close to completion',
      changes: {
        addResources: nearCompletion.map(i => ({
          initiativeId: i.id,
          additionalHours: 40 // 1 week of additional work
        }))
      },
      results: { newProgress: {}, timeToCompletion: {}, riskFactors: [] }
    })
  }

  return scenarios.map(scenario => runWhatIfScenario(initiatives, scenario))
}

// =====================================================
// Strategic Analytics Mocks
// =====================================================

export function generateStrategicMetrics(
  season: StrategySeason | null,
  initiatives: Initiative[],
  tasks: StrategyTask[]
): {
  velocityTrend: number[]
  progressDistribution: { name: string; value: number }[]
  weeklyOutput: number
  focusScore: number
  completionForecast: { week: string; completed: number; total: number }[]
} {
  // Mock velocity trend (last 8 weeks)
  const velocityTrend = Array.from({ length: 8 }, (_, i) => {
    const baseVelocity = 12
    const variance = Math.sin(i * 0.5) * 3
    const trend = i * 0.5 // Slight upward trend
    return Math.round(baseVelocity + variance + trend)
  })

  // Progress distribution across initiatives
  const progressDistribution = initiatives.map(init => ({
    name: init.title.slice(0, 20) + (init.title.length > 20 ? '...' : ''),
    value: init.progress
  }))

  // Calculate weekly output
  const completedThisWeek = tasks.filter(task => {
    if (task.status !== 'completed' || !task.completion_date) return false
    const completed = new Date(task.completion_date)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return completed >= weekAgo
  }).length

  // Focus score based on task distribution
  const totalTasks = tasks.length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const focusScore = totalTasks > 0
    ? Math.round((1 - (inProgressTasks / totalTasks)) * 100)
    : 100

  // Completion forecast (next 4 weeks)
  const completionForecast = Array.from({ length: 4 }, (_, i) => {
    const weekDate = new Date()
    weekDate.setDate(weekDate.getDate() + (i + 1) * 7)
    const weekStr = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    const totalTasks = tasks.length
    const currentCompleted = tasks.filter(t => t.status === 'completed').length
    const weeklyRate = Math.max(3, completedThisWeek || 5) // Minimum 3 tasks per week
    const projectedCompleted = Math.min(totalTasks, currentCompleted + (weeklyRate * (i + 1)))

    return {
      week: weekStr,
      completed: projectedCompleted,
      total: totalTasks
    }
  })

  return {
    velocityTrend,
    progressDistribution,
    weeklyOutput: completedThisWeek,
    focusScore,
    completionForecast
  }
}

// =====================================================
// Agent Workload Simulation
// =====================================================

export function simulateAgentWorkload(
  agents: StrategyAgent[],
  tasks: StrategyTask[]
): {
  agentUtilization: { agent: string; utilization: number }[]
  taskDistribution: { agent: string; tasks: number }[]
  bottlenecks: string[]
  suggestions: string[]
} {
  const agentUtilization = agents.map(agent => {
    const workload = agent.workload || { inProgressTasks: 0, totalTasks: 0 }
    const utilization = workload.totalTasks > 0
      ? Math.round((workload.inProgressTasks / Math.max(3, workload.totalTasks * 0.3)) * 100)
      : 0

    return {
      agent: agent.name,
      utilization: Math.min(100, utilization)
    }
  })

  const taskDistribution = agents.map(agent => ({
    agent: agent.name,
    tasks: tasks.filter(t => t.assignee === agent.id).length
  }))

  // Identify bottlenecks
  const bottlenecks: string[] = []
  const overloadedAgents = agentUtilization.filter(a => a.utilization > 80)
  bottlenecks.push(...overloadedAgents.map(a => `${a.agent} is overloaded (${a.utilization}% utilization)`))

  const blockedTasks = tasks.filter(t => t.status === 'on_hold' && t.assignee !== 'me')
  if (blockedTasks.length > 0) {
    bottlenecks.push(`${blockedTasks.length} agent tasks are blocked`)
  }

  // Generate suggestions
  const suggestions: string[] = []
  const underutilizedAgents = agentUtilization.filter(a => a.utilization < 30)
  if (underutilizedAgents.length > 0 && overloadedAgents.length > 0) {
    suggestions.push('Consider redistributing tasks from overloaded to underutilized agents')
  }

  if (blockedTasks.length > 0) {
    suggestions.push('Review and unblock pending agent tasks to improve throughput')
  }

  const avgTasksPerAgent = taskDistribution.reduce((sum, a) => sum + a.tasks, 0) / agents.length
  const imbalanced = taskDistribution.filter(a => Math.abs(a.tasks - avgTasksPerAgent) > 2)
  if (imbalanced.length > 1) {
    suggestions.push('Task distribution is imbalanced - consider evening the workload')
  }

  return {
    agentUtilization,
    taskDistribution,
    bottlenecks,
    suggestions
  }
}

// =====================================================
// Strategic Insights Generator
// =====================================================

export function generateStrategicInsights(
  season: StrategySeason | null,
  initiatives: Initiative[],
  tasks: StrategyTask[]
): {
  keyInsights: string[]
  actionableRecommendations: string[]
  riskAlerts: string[]
  positiveIndicators: string[]
} {
  const keyInsights: string[] = []
  const actionableRecommendations: string[] = []
  const riskAlerts: string[] = []
  const positiveIndicators: string[] = []

  // Analyze initiative progress
  const avgProgress = initiatives.reduce((sum, i) => sum + i.progress, 0) / initiatives.length
  if (avgProgress > 70) {
    positiveIndicators.push('Strong progress across initiatives - season goals on track')
  } else if (avgProgress < 30) {
    riskAlerts.push('Low progress across initiatives - strategic review recommended')
  }

  // Check for stalled initiatives
  const stalledInitiatives = initiatives.filter(i => i.progress < 20 && i.tasks.length > 0)
  if (stalledInitiatives.length > 0) {
    keyInsights.push(`${stalledInitiatives.length} initiatives showing minimal progress`)
    actionableRecommendations.push('Review resource allocation for stalled initiatives')
  }

  // Task completion analysis
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const totalTasks = tasks.length
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  if (completionRate > 80) {
    positiveIndicators.push('High task completion rate indicates good execution momentum')
  } else if (completionRate < 40) {
    riskAlerts.push('Low task completion rate may impact strategic timeline')
  }

  // Agent delegation analysis
  const agentTasks = tasks.filter(t => t.assignee && t.assignee !== 'me')
  if (agentTasks.length === 0) {
    actionableRecommendations.push('Consider delegating routine tasks to AI agents for better leverage')
  } else {
    const agentCompletionRate = agentTasks.filter(t => t.status === 'completed').length / agentTasks.length
    if (agentCompletionRate > 0.7) {
      positiveIndicators.push('AI delegation showing strong results')
    }
  }

  // Season timeline analysis
  if (season) {
    const seasonProgress = season.progress || 0
    const avgInitiativeProgress = initiatives.reduce((sum, i) => sum + i.progress, 0) / initiatives.length

    if (seasonProgress > avgInitiativeProgress + 20) {
      riskAlerts.push('Season timeline ahead of initiative progress - consider acceleration')
    } else if (avgInitiativeProgress > seasonProgress + 20) {
      positiveIndicators.push('Initiative progress ahead of season timeline')
    }
  }

  // Task distribution analysis
  const myTasks = tasks.filter(t => !t.assignee || t.assignee === 'me')
  const myInProgress = myTasks.filter(t => t.status === 'in_progress')

  if (myInProgress.length > 5) {
    actionableRecommendations.push('Consider focusing on fewer tasks simultaneously to improve completion rate')
  }

  // Priority analysis
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent')
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date) return false
    return new Date(t.due_date) < new Date() && t.status !== 'completed'
  })

  if (overdueTasks.length > 0) {
    riskAlerts.push(`${overdueTasks.length} tasks are overdue`)
  }

  if (highPriorityTasks.length > 3) {
    keyInsights.push('Multiple high-priority tasks may indicate need for better prioritization')
  }

  return {
    keyInsights,
    actionableRecommendations,
    riskAlerts,
    positiveIndicators
  }
}

// =====================================================
// Mock Data Generators for Testing
// =====================================================

export function generateMockInitiatives(seasonId: string): Initiative[] {
  return [
    {
      id: 'init-1',
      seasonId,
      title: 'Launch ZephyrOS Strategy Module',
      description: 'Build and deploy comprehensive strategy management system',
      progress: 65,
      category: 'Product',
      priority: 'high',
      status: 'in_progress',
      due_date: '2024-12-31',
      tasks: [],
      tags: ['initiative', 'product', 'strategic'],
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-20T00:00:00Z'
    },
    {
      id: 'init-2',
      seasonId,
      title: 'Grow Personal AI Brand',
      description: 'Establish thought leadership in AI strategy space',
      progress: 40,
      category: 'Marketing',
      priority: 'medium',
      status: 'in_progress',
      tasks: [],
      tags: ['initiative', 'marketing', 'branding'],
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-01-18T00:00:00Z'
    },
    {
      id: 'init-3',
      seasonId,
      title: 'Optimize Development Workflow',
      description: 'Streamline development processes and tooling',
      progress: 80,
      category: 'Process',
      priority: 'medium',
      status: 'in_progress',
      tasks: [],
      tags: ['initiative', 'process', 'efficiency'],
      created_at: '2024-01-05T00:00:00Z',
      updated_at: '2024-01-22T00:00:00Z'
    }
  ]
}

export function generateMockStrategicTasks(): StrategyTask[] {
  return [
    {
      id: 'task-1',
      title: 'Design strategy UI components',
      description: 'Create reusable components for strategy dashboard',
      status: 'completed',
      priority: 'high',
      progress: 100,
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-18T00:00:00Z',
      tags: ['ui', 'components'],
      assignee: 'me',
      initiativeId: 'init-1',
      initiativeTitle: 'Launch ZephyrOS Strategy Module'
    },
    {
      id: 'task-2',
      title: 'Implement data adapters',
      description: 'Build adapters to transform existing APIs',
      status: 'in_progress',
      priority: 'high',
      progress: 75,
      created_at: '2024-01-16T00:00:00Z',
      updated_at: '2024-01-20T00:00:00Z',
      tags: ['backend', 'api'],
      assignee: 'claude',
      assignedAgent: {
        id: 'claude',
        name: 'Claude',
        description: 'AI coding assistant',
        status: 'online',
        provider: 'anthropic'
      },
      agentStatus: 'working',
      initiativeId: 'init-1',
      initiativeTitle: 'Launch ZephyrOS Strategy Module'
    }
  ]
}