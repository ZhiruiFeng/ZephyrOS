'use client'

import React, { useState, useMemo } from 'react'
import {
  ChevronRight,
  Rocket,
  Brain,
  Network,
  ClipboardCheck,
  Wand2,
  Plus,
  Bot,
  PenLine,
  Send,
  LayoutDashboard,
  CalendarClock,
  Settings2,
  Shuffle,
  Lightbulb,
  Eye,
  RefreshCw,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'

import { useAuth } from '../../contexts/AuthContext'
import LoginPage from '../components/auth/LoginPage'
import { useStrategyDashboard, useStrategyTasks, useStrategyMemories } from '../../lib/hooks/strategy'
import { generateWhatIfScenarios, runWhatIfScenario, generateStrategicInsights } from '../../lib/mocks/strategy'
import type { StrategyLens, WhatIfScenario } from '../../lib/types/strategy'

// Simple UI Components
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
)

const CardHeader = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
)

const CardTitle = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
)

const CardDescription = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <p className={`text-sm text-gray-600 mt-1 ${className}`}>
    {children}
  </p>
)

const CardContent = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
)

const Button = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  size = "default",
  className = ""
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "secondary" | "outline"
  size?: "default" | "sm"
  className?: string
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
  const sizeClasses = size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-2 text-sm"
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500"
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

const Badge = ({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: "default" | "secondary" | "outline", className?: string }) => {
  const variantClasses = {
    default: "bg-blue-100 text-blue-800",
    secondary: "bg-gray-100 text-gray-800",
    outline: "border border-gray-300 text-gray-700"
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}

const Textarea = ({
  placeholder,
  value,
  onChange,
  className = ""
}: {
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  className?: string
}) => (
  <textarea
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
  />
)

// Helper: Progress Bar Color
function progressIntent(p: number) {
  if (p >= 80) return 'bg-green-500'
  if (p >= 50) return 'bg-emerald-400'
  if (p >= 25) return 'bg-yellow-400'
  return 'bg-slate-300'
}

// Strategic Tree Component
function TreeNode({
  label,
  children,
  depth = 0,
}: {
  label: React.ReactNode
  children?: React.ReactNode
  depth?: number
}) {
  return (
    <div className="relative pl-4">
      <div className="flex items-start gap-2">
        <ChevronRight className="h-4 w-4 mt-1 text-slate-400" />
        <div className="text-sm leading-5">{label}</div>
      </div>
      {children && (
        <div className="ml-5 border-l border-dashed border-slate-200 pl-4 mt-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default function StrategyPage() {
  const { user, loading: authLoading } = useAuth()
  const { dashboard, loading, error, refetch } = useStrategyDashboard()

  // Additional hooks for interactive features
  const { createTask, delegateTask } = useStrategyTasks()
  const { createReflection } = useStrategyMemories()

  // UI State
  const [lens, setLens] = useState<StrategyLens>('vision')
  const [scratch, setScratch] = useState('')
  const [whatIfAutoRebalance, setWhatIfAutoRebalance] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<WhatIfScenario | null>(null)
  const [reflectionContent, setReflectionContent] = useState('')
  const [showAgentModal, setShowAgentModal] = useState(false)

  // Extract data (moved before early returns)
  const { season, initiatives, myTasks, agentTasks, agents, recentMemories } = dashboard || {}

  // Generate what-if scenarios (moved before early returns)
  const whatIfScenarios = useMemo(() => {
    return initiatives ? generateWhatIfScenarios(initiatives) : []
  }, [initiatives])

  // Generate strategic insights (moved before early returns)
  const insights = useMemo(() => {
    if (!season || !initiatives || !myTasks) return null
    return generateStrategicInsights(season, initiatives, [...myTasks, ...(agentTasks || [])])
  }, [season, initiatives, myTasks, agentTasks])

  // Loading states
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <LoginPage />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading Strategy Cockpit...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Error Loading Strategy Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }


  // Actions
  const promoteToTask = async () => {
    if (!scratch.trim()) return

    try {
      await createTask({
        type: 'task',
        content: {
          title: scratch.trim(),
          description: 'Created from strategy scratchpad',
          status: 'pending',
          priority: 'medium'
        },
        tags: ['strategy', 'from-scratchpad']
      })

      setScratch('')
      refetch() // Refresh dashboard data
    } catch (error) {
      console.error('Error promoting to task:', error)
      alert('Failed to create task. Please try again.')
    }
  }

  const sendToAgent = async (agentId: string) => {
    if (!scratch.trim()) return

    try {
      // First create the task
      const newTask = await createTask({
        type: 'task',
        content: {
          title: scratch.trim(),
          description: 'Delegated from strategy scratchpad',
          status: 'pending',
          priority: 'medium'
        },
        tags: ['strategy', 'agent-delegated']
      })

      // Then delegate it to the agent
      await delegateTask(newTask.id, agentId, `Please handle: ${scratch.trim()}`)

      setScratch('')
      refetch() // Refresh dashboard data
    } catch (error) {
      console.error('Error delegating to agent:', error)
      alert('Failed to delegate task to agent. Please try again.')
    }
  }

  const saveReflection = async () => {
    if (!reflectionContent.trim()) return

    try {
      await createReflection({
        content: reflectionContent.trim(),
        strategyType: 'reflection',
        seasonId: season?.id,
        impact: 'medium',
        actionable: reflectionContent.toLowerCase().includes('action') ||
                   reflectionContent.toLowerCase().includes('should') ||
                   reflectionContent.toLowerCase().includes('need'),
        tags: ['weekly-reflection', 'strategy']
      })

      setReflectionContent('')
      refetch() // Refresh dashboard data
    } catch (error) {
      console.error('Error saving reflection:', error)
      alert('Failed to save reflection. Please try again.')
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-50 to-white">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-semibold">Strategy</span>
            <Badge variant="outline" className="ml-2">Cockpit</Badge>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="secondary" className="rounded-2xl" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="secondary" className="rounded-2xl">
              <CalendarClock className="h-4 w-4 mr-2" />
              Weekly Review
            </Button>
            <Button className="rounded-2xl">
              <Rocket className="h-4 w-4 mr-2" />
              New Initiative
            </Button>
          </div>
        </div>
      </div>

      {/* Page Body */}
      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Season Goal */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    Current Season — {season?.theme || 'No Active Season'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Anchor goal: <span className="font-medium text-slate-800">
                      {season?.title || 'No season title'}
                    </span>
                    {season?.metric && <> • Metric: {season.metric}</>}
                  </CardDescription>
                </div>
                <Button variant="outline" className="rounded-2xl">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Refine
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mt-2">
                <div className="mb-2 text-sm text-slate-600">
                  Progress {season?.progress || 0}%
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-2 ${progressIntent(season?.progress || 0)} rounded-full transition-all`}
                    style={{ width: `${season?.progress || 0}%` }}
                  />
                </div>
              </div>
              {season?.strategicTheme && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">{season.strategicTheme}</Badge>
                  {season.keyMetrics?.map((metric, i) => (
                    <Badge key={i} variant="secondary">{metric}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategic Insights */}
          {insights && (
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Strategic Insights
                </CardTitle>
                <CardDescription>AI-powered analysis of your strategic progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.positiveIndicators.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2">✅ Positive Indicators</h4>
                    <ul className="text-sm space-y-1">
                      {insights.positiveIndicators.map((indicator, i) => (
                        <li key={i} className="text-green-600">• {indicator}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.riskAlerts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2">⚠️ Risk Alerts</h4>
                    <ul className="text-sm space-y-1">
                      {insights.riskAlerts.map((alert, i) => (
                        <li key={i} className="text-red-600">• {alert}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.actionableRecommendations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-700 mb-2">💡 Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {insights.actionableRecommendations.map((rec, i) => (
                        <li key={i} className="text-blue-600">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Strategic Lenses */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Strategic Lenses
              </CardTitle>
              <CardDescription>
                Switch between CEO views: vision, execution, delegation, reflection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Simple Tab Navigation */}
              <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
                {[
                  { id: 'vision', label: 'Vision', icon: Eye },
                  { id: 'execution', label: 'Execution', icon: ClipboardCheck },
                  { id: 'delegation', label: 'AI Delegation', icon: Bot },
                  { id: 'reflection', label: 'Reflection', icon: Lightbulb }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setLens(id as StrategyLens)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      lens === id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {lens === 'vision' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    See top initiatives and their alignment with the season goal.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {initiatives?.map((initiative) => (
                      <div key={initiative.id} className="border rounded-xl p-3 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{initiative.title}</div>
                          <Badge variant="outline">{initiative.progress}%</Badge>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {initiative.description}
                        </div>
                        <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-2 ${progressIntent(initiative.progress)} rounded-full`}
                            style={{ width: `${initiative.progress}%` }}
                          />
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {initiative.tasks.length} tasks • {initiative.category}
                        </div>
                      </div>
                    ))}
                    {!initiatives?.length && (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        No initiatives found. Create some to get started!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {lens === 'execution' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Your current workload at a glance.</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {/* My Tasks */}
                    <Card className="rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4" />
                          My Tasks ({myTasks?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {myTasks?.slice(0, 6).map((task) => (
                          <div key={task.id} className="border rounded-lg p-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="font-medium">{task.title}</div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{task.status}</Badge>
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-1.5 ${progressIntent(task.progress)} rounded-full`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            {task.initiativeTitle && (
                              <div className="mt-1 text-[11px] text-gray-500">
                                {task.initiativeTitle}
                              </div>
                            )}
                          </div>
                        ))}
                        {!myTasks?.length && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            No tasks assigned to you
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Agent Tasks */}
                    <Card className="rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          Agent Tasks ({agentTasks?.length || 0})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {agentTasks?.slice(0, 6).map((task) => (
                          <div key={task.id} className="border rounded-lg p-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="font-medium">{task.title}</div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{task.assignee}</Badge>
                                <Badge variant="outline">{task.status}</Badge>
                              </div>
                            </div>
                            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-1.5 ${progressIntent(task.progress)} rounded-full`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            {task.initiativeTitle && (
                              <div className="mt-1 text-[11px] text-gray-500">
                                {task.initiativeTitle}
                              </div>
                            )}
                          </div>
                        ))}
                        {!agentTasks?.length && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            No tasks delegated to agents
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {lens === 'delegation' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Monitor agent capacity and queue.</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {agents?.map((agent) => (
                      <div key={agent.id} className="border rounded-xl p-3 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="font-medium flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            {agent.name}
                          </div>
                          <Badge variant={agent.status === 'online' ? 'secondary' : 'outline'}>
                            {agent.availability || agent.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {agent.specialties?.join(', ')}
                        </div>
                        {agent.workload && (
                          <div className="mt-2 text-sm">
                            {agent.workload.inProgressTasks} active • {agent.workload.totalTasks} total
                          </div>
                        )}
                        <Button size="sm" className="mt-3 w-full">
                          <Send className="h-4 w-4 mr-2" />
                          Send Brief
                        </Button>
                      </div>
                    ))}
                    {!agents?.length && (
                      <div className="col-span-3 text-center py-8 text-gray-500">
                        No agents available
                      </div>
                    )}
                  </div>
                </div>
              )}

              {lens === 'reflection' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Capture insights to fuel strategy updates.
                  </p>
                  <Textarea
                    placeholder="What did I learn this week? What should I change next?"
                    value={reflectionContent}
                    onChange={(e) => setReflectionContent(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button variant="secondary">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Prompt Me
                    </Button>
                    <Button onClick={saveReflection} disabled={!reflectionContent.trim()}>
                      Save Reflection
                    </Button>
                  </div>

                  {/* Recent Reflections */}
                  {recentMemories && recentMemories.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-3">Recent Strategic Memories</h4>
                      <div className="space-y-2">
                        {recentMemories.slice(0, 3).map((memory) => (
                          <div key={memory.id} className="border rounded-lg p-3 text-sm">
                            <div className="font-medium">{memory.title || 'Untitled'}</div>
                            <div className="text-gray-600 mt-1">
                              {memory.note.slice(0, 120)}
                              {memory.note.length > 120 && '...'}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {memory.strategyType}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(memory.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategic Map */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Network className="h-5 w-5" />
                Strategic Map
              </CardTitle>
              <CardDescription>Goals → Initiatives → Tasks → Agents</CardDescription>
            </CardHeader>
            <CardContent>
              <TreeNode
                label={
                  <span>
                    <span className="font-medium">Season:</span> {season?.title || 'No Active Season'}
                  </span>
                }
              >
                {initiatives?.map((initiative) => (
                  <TreeNode
                    key={initiative.id}
                    label={
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{initiative.title}</span>
                        <Badge variant="outline">{initiative.progress}%</Badge>
                      </div>
                    }
                  >
                    {initiative.tasks.slice(0, 5).map((task) => (
                      <TreeNode
                        key={task.id}
                        label={
                          <div className="flex items-center gap-2">
                            <span>{task.title}</span>
                            <Badge variant="outline">{task.status}</Badge>
                            {task.assignee && task.assignee !== 'me' && (
                              <Badge variant="secondary">{task.assignee}</Badge>
                            )}
                          </div>
                        }
                      />
                    ))}
                    {initiative.tasks.length > 5 && (
                      <TreeNode
                        label={
                          <span className="text-slate-500">
                            +{initiative.tasks.length - 5} more tasks...
                          </span>
                        }
                      />
                    )}
                  </TreeNode>
                ))}
                {!initiatives?.length && (
                  <TreeNode
                    label={<span className="text-slate-500">No initiatives yet</span>}
                  />
                )}
              </TreeNode>
            </CardContent>
          </Card>
        </div>

        {/* Right Rail */}
        <div className="space-y-4">
          {/* Scratchpad */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PenLine className="h-5 w-5" />
                Scratchpad
              </CardTitle>
              <CardDescription>
                Drop thoughts → promote to task or send to agent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Jot an idea, plan, or memory…"
                value={scratch}
                onChange={(e) => setScratch(e.target.value)}
                className="min-h-[110px]"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={promoteToTask}
                  disabled={!scratch.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Promote to Task
                </Button>
                <Button
                  disabled={!scratch.trim()}
                  onClick={() => setShowAgentModal(true)}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Send to Agent
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* What-If Simulator */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shuffle className="h-5 w-5" />
                What‑If Simulator
              </CardTitle>
              <CardDescription>Drop an initiative → see rebalanced focus.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="rebalance" className="text-sm font-medium">Auto‑rebalance</label>
                  <input
                    type="checkbox"
                    id="rebalance"
                    checked={whatIfAutoRebalance}
                    onChange={(e) => setWhatIfAutoRebalance(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>

                {whatIfScenarios.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pre-built Scenarios</label>
                    {whatIfScenarios.map((scenario, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setSelectedScenario(scenario)}
                      >
                        {scenario.name}
                      </Button>
                    ))}
                  </div>
                )}

                {selectedScenario && (
                  <div className="border rounded-lg p-3 text-sm">
                    <div className="font-medium">{selectedScenario.name}</div>
                    <div className="text-gray-600 mt-1">{selectedScenario.description}</div>
                    {selectedScenario.results.riskFactors.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-red-600">Risks:</div>
                        <ul className="text-xs text-red-600 mt-1">
                          {selectedScenario.results.riskFactors.map((risk, i) => (
                            <li key={i}>• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Pre-baked CEO moves.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="secondary">Break down selected goal</Button>
              <Button variant="secondary">Draft OKRs for season</Button>
              <Button variant="secondary">Create weekly cadence</Button>
              <Button variant="secondary">Spin up research docket</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-auto max-w-7xl px-4 pb-8 text-center text-xs text-gray-500">
        ZephyrOS Strategy Cockpit · Production · {new Date().getFullYear()}
      </div>

      {/* Agent Selection Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Send to Agent</h3>
              <button
                onClick={() => setShowAgentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Choose an AI agent to break down or execute.
            </p>
            <div className="space-y-3">
              {agents?.map((agent) => (
                <Button
                  key={agent.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    sendToAgent(agent.id)
                    setShowAgentModal(false)
                  }}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  {agent.name} — {agent.specialties?.join(', ')}
                </Button>
              ))}
              {!agents?.length && (
                <div className="text-center py-4 text-gray-500">
                  No agents available
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}