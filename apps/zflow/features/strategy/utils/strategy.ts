import type { Season } from '../../../../zmemory/types/narrative'
import type { Task, Memory, Agent } from 'types'
import type {
  StrategySeason,
  Initiative,
  StrategyTask,
  StrategyMemory,
  StrategyAgent,
  InitiativeProgress,
  AgentWorkloadSummary,
  StrategyDashboard
} from '../types/strategy'

// =====================================================
// Season Adapters
// =====================================================

export function adaptSeasonToStrategy(season: Season): StrategySeason {
  // Extract strategic metadata from season
  const metadata = season.metadata || {}

  return {
    ...season,
    progress: calculateSeasonProgress(season),
    metric: extractMetricFromSeason(season),
    strategicTheme: metadata.strategicTheme || season.theme,
    keyMetrics: metadata.keyMetrics || [],
    quarterlyGoals: metadata.quarterlyGoals || []
  }
}

function calculateSeasonProgress(season: Season): number {
  // For now, return a computed value based on season dates
  // In future, this would be computed from initiative progress
  const now = new Date()
  const start = new Date(season.start_date || season.created_at)
  const end = season.end_date ? new Date(season.end_date) : null

  if (!end) {
    // If no end date, estimate 3 months from start
    const estimatedEnd = new Date(start)
    estimatedEnd.setMonth(estimatedEnd.getMonth() + 3)
    const totalDays = (estimatedEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    const daysPassed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    return Math.min(Math.max(Math.round((daysPassed / totalDays) * 100), 0), 100)
  }

  const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const daysPassed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  return Math.min(Math.max(Math.round((daysPassed / totalDays) * 100), 0), 100)
}

function extractMetricFromSeason(season: Season): string {
  // Try to extract metric from intention or metadata
  if (season.metadata?.metric) {
    return season.metadata.metric
  }

  // Parse from intention text
  if (season.intention) {
    const metricMatch = season.intention.match(/metric[:\s]+([^.,]+)/i)
    if (metricMatch) {
      return metricMatch[1].trim()
    }
  }

  // Default metric based on theme
  const themeMetrics = {
    spring: 'New projects launched',
    summer: 'Peak performance output',
    autumn: 'Goals achieved',
    winter: 'Reflection insights'
  }

  return themeMetrics[season.theme] || 'Weekly output'
}

// =====================================================
// Task Adapters
// =====================================================

export function adaptTasksToInitiatives(tasks: Task[]): Initiative[] {
  // Filter tasks that are marked as initiatives
  const initiativeTasks = tasks.filter(task =>
    task.tags?.includes('initiative') ||
    task.tags?.includes('strategic') ||
    task.category?.name?.toLowerCase().includes('initiative')
  )

  return initiativeTasks.map(task => adaptTaskToInitiative(task, tasks))
}

export function adaptTaskToInitiative(task: Task, allTasks: Task[]): Initiative {
  // Find related tasks (tasks with same category/tags - simplified since parent_task_id doesn't exist)
  const relatedTasks = allTasks.filter(t =>
    t.id !== task.id && (
      t.category_id === task.category_id ||
      t.tags?.some(tag => task.tags?.includes(tag))
    )
  ).map(t => adaptTaskToStrategy(t))

  return {
    id: task.id,
    seasonId: extractSeasonIdFromTask(task),
    title: task.title,
    description: task.description,
    progress: calculateInitiativeProgress(task, relatedTasks),
    category: task.category?.name,
    priority: task.priority,
    status: task.status,
    due_date: task.due_date,
    tasks: relatedTasks,
    tags: task.tags || [],
    created_at: task.created_at,
    updated_at: task.updated_at
  }
}

export function adaptTaskToStrategy(task: Task): StrategyTask {
  return {
    ...task,
    initiativeId: extractInitiativeIdFromTask(task),
    initiativeTitle: extractInitiativeTitleFromTask(task),
    assignedAgent: extractAssignedAgentFromTask(task),
    agentStatus: extractAgentStatusFromTask(task)
  }
}

function extractSeasonIdFromTask(task: Task): string {
  // Try to extract season ID from metadata or notes
  const metadata = (task as any).metadata || {}
  if (metadata.seasonId) {
    return metadata.seasonId
  }

  // For now, return a default season ID
  // In production, this would be properly linked
  return 'current-season'
}

function extractInitiativeIdFromTask(task: Task): string | undefined {
  // Check metadata for initiative linkage
  const metadata = (task as any).metadata || {}
  return metadata.initiativeId
}

function extractInitiativeTitleFromTask(task: Task): string | undefined {
  // This would need to be looked up from the parent task
  // For now, extract from category or tags
  if (task.category?.name && task.category.name !== 'Default') {
    return task.category.name
  }

  return undefined
}

function extractAssignedAgentFromTask(task: Task): Agent | undefined {
  if (task.assignee && task.assignee !== 'me') {
    // Return a mock agent based on assignee
    return {
      id: task.assignee,
      name: task.assignee,
      description: `AI Agent: ${task.assignee}`,
      status: 'online',
      provider: 'anthropic'
    }
  }

  return undefined
}

function extractAgentStatusFromTask(task: Task): 'idle' | 'working' | 'blocked' | undefined {
  if (!task.assignee || task.assignee === 'me') {
    return undefined
  }

  switch (task.status) {
    case 'in_progress':
      return 'working'
    case 'on_hold':
      return 'blocked'
    default:
      return 'idle'
  }
}

function calculateInitiativeProgress(initiative: Task, relatedTasks: StrategyTask[]): number {
  if (relatedTasks.length === 0) {
    return initiative.progress || 0
  }

  const totalTasks = relatedTasks.length
  const completedTasks = relatedTasks.filter(t => t.status === 'completed').length
  const inProgressTasks = relatedTasks.filter(t => t.status === 'in_progress').length

  // Completed tasks count as 100%, in-progress as 50%
  const totalProgress = (completedTasks * 100) + (inProgressTasks * 50)
  return Math.round(totalProgress / totalTasks)
}

// =====================================================
// Agent Adapters
// =====================================================

export function adaptAgentToStrategy(agent: Agent, assignedTasks: Task[] = []): StrategyAgent {
  const workload = calculateAgentWorkload(assignedTasks)

  return {
    ...agent,
    workload,
    specialties: extractAgentSpecialties(agent),
    currentFocus: extractCurrentFocus(assignedTasks),
    availability: determineAvailability(agent, workload)
  }
}

function calculateAgentWorkload(tasks: Task[]) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const totalTasks = tasks.length
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length
  const completedToday = tasks.filter(t =>
    t.status === 'completed' &&
    t.completion_date?.startsWith(today)
  ).length

  // Estimate hours remaining based on estimated duration
  const estimatedHoursRemaining = tasks
    .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
    .reduce((total, task) => total + (task.estimated_duration || 60), 0) / 60

  return {
    totalTasks,
    inProgressTasks,
    completedToday,
    estimatedHoursRemaining
  }
}

function extractAgentSpecialties(agent: Agent): string[] {
  // Extract from agent name or description
  const specialtyMap: Record<string, string[]> = {
    'gpt-4': ['analysis', 'reasoning', 'writing'],
    'claude': ['research', 'coding', 'analysis'],
    'gpt-3.5-turbo': ['quick tasks', 'summarization'],
    'research': ['research', 'data analysis'],
    'code': ['coding', 'development', 'debugging'],
    'marketing': ['content', 'strategy', 'outreach']
  }

  const agentKey = agent.id.toLowerCase()
  for (const [key, specialties] of Object.entries(specialtyMap)) {
    if (agentKey.includes(key)) {
      return specialties
    }
  }

  return ['general assistance']
}

function extractCurrentFocus(tasks: Task[]): string | undefined {
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  if (inProgressTasks.length === 0) {
    return undefined
  }

  // Return the most recent in-progress task
  const latest = inProgressTasks.sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0]

  return latest.title
}

function determineAvailability(agent: Agent, workload: any): 'available' | 'busy' | 'offline' {
  if (agent.status === 'offline') {
    return 'offline'
  }

  if (workload.inProgressTasks >= 3) {
    return 'busy'
  }

  return 'available'
}

// =====================================================
// Memory Adapters
// =====================================================

export function adaptMemoryToStrategy(memory: Memory): StrategyMemory {
  return {
    ...memory,
    strategyType: extractStrategyType(memory),
    seasonId: extractSeasonIdFromMemory(memory),
    initiativeId: extractInitiativeIdFromMemory(memory),
    impact: extractImpactLevel(memory),
    actionable: determineIfActionable(memory)
  }
}

function extractStrategyType(memory: Memory): 'reflection' | 'insight' | 'goal' | 'lesson' | 'idea' {
  const content = memory.note.toLowerCase()

  if (content.includes('reflect') || content.includes('learned')) {
    return 'reflection'
  }
  if (content.includes('insight') || content.includes('realize')) {
    return 'insight'
  }
  if (content.includes('goal') || content.includes('aim') || content.includes('target')) {
    return 'goal'
  }
  if (content.includes('lesson') || content.includes('mistake')) {
    return 'lesson'
  }

  return 'idea'
}

function extractSeasonIdFromMemory(memory: Memory): string | undefined {
  // Check if memory is tagged with a season
  const seasonTag = memory.tags?.find(tag => tag.startsWith('season:'))
  if (seasonTag) {
    return seasonTag.replace('season:', '')
  }

  return undefined
}

function extractInitiativeIdFromMemory(memory: Memory): string | undefined {
  // Check if memory is tagged with an initiative
  const initiativeTag = memory.tags?.find(tag => tag.startsWith('initiative:'))
  if (initiativeTag) {
    return initiativeTag.replace('initiative:', '')
  }

  return undefined
}

function extractImpactLevel(memory: Memory): 'low' | 'medium' | 'high' {
  // Use importance level if available
  if (memory.importance_level) {
    return memory.importance_level
  }

  // Check if it's a highlight
  if (memory.is_highlight) {
    return 'high'
  }

  // Default to medium
  return 'medium'
}

function determineIfActionable(memory: Memory): boolean {
  const content = memory.note.toLowerCase()
  const actionWords = ['todo', 'action', 'next', 'should', 'need to', 'implement', 'create', 'build']

  return actionWords.some(word => content.includes(word))
}

// =====================================================
// Dashboard Adapter
// =====================================================

export function adaptToStrategyDashboard(
  season: Season | null,
  tasks: Task[],
  agents: Agent[],
  memories: Memory[]
): StrategyDashboard {
  const strategySeason = season ? adaptSeasonToStrategy(season) : null
  const initiatives = adaptTasksToInitiatives(tasks)

  // Separate tasks by assignee
  const myTasks = tasks
    .filter(t => !t.assignee || t.assignee === 'me')
    .map(adaptTaskToStrategy)

  const agentTasks = tasks
    .filter(t => t.assignee && t.assignee !== 'me')
    .map(adaptTaskToStrategy)

  const strategyAgents = agents.map(agent => {
    const assignedTasks = tasks.filter(t => t.assignee === agent.id)
    return adaptAgentToStrategy(agent, assignedTasks)
  })

  const strategyMemories = memories
    .filter(m => m.tags?.some(tag =>
      ['strategy', 'strategic', 'reflection', 'goal'].includes(tag)
    ))
    .map(adaptMemoryToStrategy)
    .slice(0, 10) // Recent 10

  return {
    season: strategySeason,
    initiatives,
    myTasks,
    agentTasks,
    agents: strategyAgents,
    recentMemories: strategyMemories
  }
}

// =====================================================
// Progress Calculators
// =====================================================

export function calculateInitiativeProgressDetails(
  initiative: Initiative
): InitiativeProgress {
  const totalTasks = initiative.tasks.length
  const completedTasks = initiative.tasks.filter(t => t.status === 'completed').length
  const inProgressTasks = initiative.tasks.filter(t => t.status === 'in_progress').length
  const blockedTasks = initiative.tasks.filter(t => t.status === 'on_hold').length

  const progressPercentage = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  // Estimate completion based on remaining tasks and average completion rate
  let estimatedCompletion: string | undefined
  if (totalTasks > 0 && completedTasks < totalTasks) {
    const remainingTasks = totalTasks - completedTasks
    const daysToComplete = remainingTasks * 2 // Rough estimate: 2 days per task
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + daysToComplete)
    estimatedCompletion = completionDate.toISOString().split('T')[0]
  }

  return {
    initiativeId: initiative.id,
    totalTasks,
    completedTasks,
    inProgressTasks,
    blockedTasks,
    progressPercentage,
    estimatedCompletion
  }
}

export function calculateAgentWorkloadSummary(
  agent: StrategyAgent
): AgentWorkloadSummary {
  const workload = agent.workload || {
    totalTasks: 0,
    inProgressTasks: 0,
    completedToday: 0,
    estimatedHoursRemaining: 0
  }

  // Determine capacity based on workload
  let currentCapacity: 'low' | 'medium' | 'high' | 'overloaded' = 'low'
  if (workload.inProgressTasks >= 5) {
    currentCapacity = 'overloaded'
  } else if (workload.inProgressTasks >= 3) {
    currentCapacity = 'high'
  } else if (workload.inProgressTasks >= 1) {
    currentCapacity = 'medium'
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    totalAssignedTasks: workload.totalTasks,
    activeTasksCount: workload.inProgressTasks,
    completedTasksToday: workload.completedToday,
    averageTaskDuration: 120, // Mock: 2 hours average
    currentCapacity
  }
}