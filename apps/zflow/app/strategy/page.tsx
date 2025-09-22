'use client'

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
  CalendarClock,
  Settings2,
  Shuffle,
  Lightbulb,
  Eye,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  X,
  HelpCircle
} from 'lucide-react'

import { useAuth } from '../../contexts/AuthContext'
import LoginPage from '../components/auth/LoginPage'
import { useStrategyDashboard, useStrategyTasks, useStrategyMemories } from '../../lib/hooks/strategy'
import { generateWhatIfScenarios, generateStrategicInsights } from '../../lib/mocks/strategy'
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
  className = "",
  title
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "secondary" | "outline"
  size?: "default" | "sm"
  className?: string
  title?: string
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
      title={title}
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
  if (p >= 90) return 'bg-gradient-to-r from-green-500 to-green-600'
  if (p >= 75) return 'bg-gradient-to-r from-green-400 to-green-500'
  if (p >= 50) return 'bg-gradient-to-r from-blue-400 to-blue-500'
  if (p >= 25) return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
  if (p >= 10) return 'bg-gradient-to-r from-orange-400 to-orange-500'
  return 'bg-gradient-to-r from-gray-300 to-gray-400'
}

// Strategic Tree Component
const TreeNode = React.memo(function TreeNode({
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
})

// Memoized Initiative Card Component
const InitiativeCard = React.memo(function InitiativeCard({
  initiative,
  progressIntent
}: {
  initiative: any
  progressIntent: (p: number) => string
}) {
  return (
    <div
      key={initiative.id}
      className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow duration-200 touch-pan-y"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm sm:text-base leading-tight min-w-0 flex-1">
          {initiative.title}
        </div>
        <Badge variant="outline" className="flex-shrink-0">
          {initiative.progress}%
        </Badge>
      </div>
      <div className="mt-2 text-xs sm:text-sm text-gray-500 line-clamp-2">
        {initiative.description}
      </div>
      <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 ${progressIntent(initiative.progress)} rounded-full transition-all duration-300`}
          style={{ width: `${initiative.progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{initiative.tasks.length} tasks</span>
        <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">
          {initiative.category}
        </span>
      </div>
    </div>
  )
})

// Memoized Task Card Component
const TaskCard = React.memo(function TaskCard({
  task,
  progressIntent
}: {
  task: any
  progressIntent: (p: number) => string
}) {
  return (
    <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm leading-tight min-w-0 flex-1">
          {task.title}
        </div>
        <Badge variant="outline" className="flex-shrink-0 text-xs">
          {task.status}
        </Badge>
      </div>
      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 ${progressIntent(task.progress)} rounded-full transition-all duration-300`}
          style={{ width: `${task.progress}%` }}
        />
      </div>
      {task.initiativeTitle && (
        <div className="mt-2 text-xs text-gray-500 truncate">
          {task.initiativeTitle}
        </div>
      )}
    </div>
  )
})

// Memoized Agent Card Component
const AgentCard = React.memo(function AgentCard({
  agent
}: {
  agent: any
}) {
  return (
    <div
      key={agent.id}
      className="border rounded-xl p-4 bg-white hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="font-medium flex items-center gap-2 min-w-0 flex-1">
          <Bot className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{agent.name}</span>
        </div>
        <Badge
          variant={agent.status === 'online' ? 'secondary' : 'outline'}
          className="flex-shrink-0 text-xs"
        >
          {agent.availability || agent.status}
        </Badge>
      </div>
      <div className="text-xs text-gray-500 mb-3 line-clamp-2">
        {agent.specialties?.join(', ')}
      </div>
      {agent.workload && (
        <div className="text-sm mb-3 flex justify-between">
          <span className="text-gray-600">
            {agent.workload.inProgressTasks} active
          </span>
          <span className="text-gray-500">
            {agent.workload.totalTasks} total
          </span>
        </div>
      )}
      <Button size="sm" className="w-full">
        <Send className="h-4 w-4 mr-2" />
        Send Brief
      </Button>
    </div>
  )
})

// Memoized Agent Task Card Component
const AgentTaskCard = React.memo(function AgentTaskCard({
  task,
  progressIntent
}: {
  task: any
  progressIntent: (p: number) => string
}) {
  return (
    <div key={task.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors duration-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-medium text-sm leading-tight min-w-0 flex-1">
          {task.title}
        </div>
        <Badge variant="outline" className="flex-shrink-0 text-xs">
          {task.status}
        </Badge>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="text-xs">
          {task.assignee}
        </Badge>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-2 ${progressIntent(task.progress)} rounded-full transition-all duration-300`}
          style={{ width: `${task.progress}%` }}
        />
      </div>
      {task.initiativeTitle && (
        <div className="mt-2 text-xs text-gray-500 truncate">
          {task.initiativeTitle}
        </div>
      )}
    </div>
  )
})

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

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  // Filtered data based on search and filters
  const filteredInitiatives = useMemo(() => {
    if (!initiatives) return []

    return initiatives.filter(initiative => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          initiative.title?.toLowerCase().includes(searchLower) ||
          initiative.description?.toLowerCase().includes(searchLower) ||
          initiative.category?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && initiative.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && initiative.priority !== priorityFilter) return false

      // Category filter
      if (categoryFilter !== 'all' && initiative.category !== categoryFilter) return false

      return true
    })
  }, [initiatives, searchQuery, statusFilter, priorityFilter, categoryFilter])

  const filteredMyTasks = useMemo(() => {
    if (!myTasks) return []

    return myTasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.initiativeTitle?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false

      return true
    })
  }, [myTasks, searchQuery, statusFilter, priorityFilter])

  const filteredAgentTasks = useMemo(() => {
    if (!agentTasks) return []

    return agentTasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          task.title?.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.assignee?.toLowerCase().includes(searchLower) ||
          task.initiativeTitle?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false

      return true
    })
  }, [agentTasks, searchQuery, statusFilter, priorityFilter])

  // Memoized functions for performance
  const progressIntentCallback = useCallback(progressIntent, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        // Allow Escape to clear search when focused on search input
        if (event.key === 'Escape' && event.target === searchInputRef.current) {
          setSearchQuery('')
          searchInputRef.current?.blur()
          return
        }
        return
      }

      // Don't trigger shortcuts when modifiers are pressed (except for specific combos)
      if (event.ctrlKey || event.metaKey || event.altKey) return

      switch (event.key) {
        case '1':
          event.preventDefault()
          setLens('vision')
          break
        case '2':
          event.preventDefault()
          setLens('execution')
          break
        case '3':
          event.preventDefault()
          setLens('delegation')
          break
        case '4':
          event.preventDefault()
          setLens('reflection')
          break
        case '/':
          event.preventDefault()
          searchInputRef.current?.focus()
          break
        case 'Escape':
          event.preventDefault()
          if (showKeyboardShortcuts) {
            setShowKeyboardShortcuts(false)
          } else if (showFilters) {
            setShowFilters(false)
          } else if (searchQuery) {
            setSearchQuery('')
          } else if (showAgentModal) {
            setShowAgentModal(false)
          }
          break
        case 'f':
          event.preventDefault()
          setShowFilters(!showFilters)
          break
        case 'r':
          event.preventDefault()
          refetch()
          break
        case '?':
          event.preventDefault()
          setShowKeyboardShortcuts(!showKeyboardShortcuts)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showFilters, searchQuery, showAgentModal, showKeyboardShortcuts, refetch])

  // Loading states
  // TODO: Temporarily bypass authentication for testing
  // if (authLoading) {
  //   return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  // }

  // if (!user) {
  //   return <LoginPage />
  // }

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-100">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-white to-gray-50/50 border-b border-gray-200/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Strategy Cockpit</h1>
                <p className="text-xs sm:text-sm text-gray-600">Strategic planning and execution dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              <Button
                variant="secondary"
                onClick={refetch}
                className="flex-shrink-0 min-w-0 px-3 sm:px-4"
                title="Refresh Dashboard"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="secondary"
                className="flex-shrink-0 min-w-0 px-3 sm:px-4"
                title="Weekly Review"
              >
                <CalendarClock className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Weekly Review</span>
              </Button>
              <Button
                className="bg-primary-600 hover:bg-primary-700 text-white flex-shrink-0 min-w-0 px-3 sm:px-4"
                title="Create New Initiative"
              >
                <Rocket className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Initiative</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search initiatives, tasks, or agents... (Press / to focus)"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={`${showFilters ? 'bg-gray-100' : ''}`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>

              {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setPriorityFilter('all')
                    setCategoryFilter('all')
                  }}
                  className="text-gray-600"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeyboardShortcuts(true)}
                className="text-gray-600"
                title="Show keyboard shortcuts (Press ?)"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expandable Filter Panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Process">Process</option>
                    <option value="Research">Research</option>
                    <option value="Development">Development</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Season Goal */}
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white to-gray-50 border-0 hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-xl truncate">
                    Current Season — {season?.theme || 'No Active Season'}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs sm:text-sm">
                    Anchor goal: <span className="font-medium text-slate-800">
                      {season?.title || 'No season title'}
                    </span>
                    {season?.metric && <> • Metric: {season.metric}</>}
                  </CardDescription>
                </div>
                <Button variant="outline" className="rounded-2xl flex-shrink-0 self-start sm:self-center">
                  <Settings2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Refine</span>
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
            <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-blue-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
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
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-purple-50/20 to-white border-0 hover:shadow-xl transition-shadow duration-300">
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
              {/* Strategic Lens Navigation - Mobile Optimized */}
              <div className="mb-6">
                <div className="flex overflow-x-auto scrollbar-hide space-x-1 bg-gray-100 p-1 rounded-lg">
                  {[
                    { id: 'vision', label: 'Vision', shortLabel: 'Vision', icon: Eye, shortcut: '1' },
                    { id: 'execution', label: 'Execution', shortLabel: 'Exec', icon: ClipboardCheck, shortcut: '2' },
                    { id: 'delegation', label: 'AI Delegation', shortLabel: 'AI', icon: Bot, shortcut: '3' },
                    { id: 'reflection', label: 'Reflection', shortLabel: 'Reflect', icon: Lightbulb, shortcut: '4' }
                  ].map(({ id, label, shortLabel, icon: Icon, shortcut }) => (
                    <button
                      key={id}
                      onClick={() => setLens(id as StrategyLens)}
                      className={`flex items-center justify-center min-w-0 flex-shrink-0 gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                        lens === id
                          ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      }`}
                      title={`${label} (Press ${shortcut})`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden xs:inline sm:hidden lg:inline whitespace-nowrap">{label}</span>
                      <span className="xs:hidden sm:inline lg:hidden whitespace-nowrap">{shortLabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {lens === 'vision' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    See top initiatives and their alignment with the season goal.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredInitiatives.map((initiative) => (
                      <InitiativeCard
                        key={initiative.id}
                        initiative={initiative}
                        progressIntent={progressIntentCallback}
                      />
                    ))}
                    {filteredInitiatives.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
                          ? 'No initiatives match your search criteria.'
                          : 'No initiatives found. Create some to get started!'
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}

              {lens === 'execution' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Your current workload at a glance.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* My Tasks */}
                    <Card className="rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <ClipboardCheck className="h-4 w-4" />
                          My Tasks ({filteredMyTasks.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {filteredMyTasks.slice(0, 6).map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            progressIntent={progressIntentCallback}
                          />
                        ))}
                        {filteredMyTasks.length === 0 && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                              ? 'No tasks match your search criteria.'
                              : 'No tasks assigned to you'
                            }
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Agent Tasks */}
                    <Card className="rounded-xl">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          Agent Tasks ({filteredAgentTasks.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {filteredAgentTasks.slice(0, 6).map((task) => (
                          <AgentTaskCard
                            key={task.id}
                            task={task}
                            progressIntent={progressIntentCallback}
                          />
                        ))}
                        {filteredAgentTasks.length === 0 && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                              ? 'No agent tasks match your search criteria.'
                              : 'No tasks delegated to agents'
                            }
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {agents?.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                      />
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
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-green-50/20 to-white border-0 hover:shadow-xl transition-shadow duration-300">
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
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-yellow-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
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
              <div className="mt-3 flex flex-col sm:grid sm:grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={promoteToTask}
                  disabled={!scratch.trim()}
                  className="w-full justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden xs:inline">Promote to Task</span>
                  <span className="xs:hidden">To Task</span>
                </Button>
                <Button
                  disabled={!scratch.trim()}
                  onClick={() => setShowAgentModal(true)}
                  className="w-full justify-center"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  <span className="hidden xs:inline">Send to Agent</span>
                  <span className="xs:hidden">To Agent</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* What-If Simulator */}
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-indigo-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
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
          <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-orange-50/30 to-white border-0 hover:shadow-xl transition-shadow duration-300">
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

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full max-h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Navigation</h4>
                <div className="space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>Switch to Vision lens</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">1</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Switch to Execution lens</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">2</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Switch to Delegation lens</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">3</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Switch to Reflection lens</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">4</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Search & Filters</h4>
                <div className="space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>Focus search</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">/</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Toggle filters</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Clear search/close modals</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Actions</h4>
                <div className="space-y-1 text-gray-600">
                  <div className="flex justify-between">
                    <span>Refresh dashboard</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">R</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Show this help</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">?</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to close this dialog
            </div>
          </div>
        </div>
      )}

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