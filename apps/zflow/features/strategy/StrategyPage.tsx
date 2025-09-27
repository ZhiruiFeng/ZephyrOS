'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { RefreshCw, AlertTriangle } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { LoginPage } from '@/shared/components'
import { useStrategyDashboard } from './hooks/useStrategyDashboard'
import { useStrategyTasks } from './hooks/useStrategyTasks'
import { useStrategyMemories } from './hooks/useStrategyMemories'
import { useDailyStrategy } from './hooks/useDailyStrategy'
import { useDayReflection } from '@/timeline'
import { generateWhatIfScenarios, generateStrategicInsights } from './mocks/strategy'
import type { StrategyLens, WhatIfScenario } from './types/strategy'

// Import all components
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button
} from './components'
import { PageHeader, SearchFilterBar } from './components'
import { StrategicLenses } from './components'
import { SeasonGoalCard, StrategicInsightsCard, StrategicMapCard } from './components'
import { Scratchpad, WhatIfSimulator, QuickActions } from './components'
import { DailyTrackingCard } from './components/DailyTrackingCard'
import { KeyboardShortcutsModal, AgentSelectionModal } from './components'
import { DailyRhythmModal } from './components/modals/DailyPlanningModal'
import { useStrategyFilters, useKeyboardShortcuts } from './hooks'
import { progressIntent } from './utils/progressIntent'


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
  const [showFilters, setShowFilters] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showDailyModal, setShowDailyModal] = useState(false)
  const [dailyModalView, setDailyModalView] = useState<'planning' | 'reflection'>('planning')
  const [dailyTrackingRefresh, setDailyTrackingRefresh] = useState(0)
  // More stable memoization to prevent unnecessary re-renders
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
  const today = useMemo(() => {
    const now = new Date()
    return now.toLocaleDateString('en-CA') // YYYY-MM-DD format
  }, []) // Only update when component mounts, not on every render

  const planningState = useDailyStrategy(today, timezone, dashboard?.season?.id)
  const reflectionState = useDayReflection(today, dashboard?.season?.id)
  const planningReload = planningState.loadData
  const reflectionReload = reflectionState.loadData

  useEffect(() => {
    if (dailyTrackingRefresh > 0) {
      // Debounce the refresh to avoid rapid consecutive calls
      const timeoutId = setTimeout(() => {
        planningReload()
        reflectionReload()
      }, 200) // 200ms delay

      return () => clearTimeout(timeoutId)
    }
  }, [dailyTrackingRefresh, planningReload, reflectionReload])

  // Extract data
  const { season, initiatives, myTasks, agentTasks, agents, recentMemories } = dashboard || {}

  // Use custom hooks for filtering and keyboard shortcuts
  const {
    searchQuery,
    statusFilter,
    priorityFilter,
    categoryFilter,
    setSearchQuery,
    setStatusFilter,
    setPriorityFilter,
    setCategoryFilter,
    filteredInitiatives,
    filteredMyTasks,
    filteredAgentTasks,
    clearFilters,
    hasActiveFilters
  } = useStrategyFilters({ initiatives: initiatives || [], myTasks: myTasks || [], agentTasks: agentTasks || [] })

  const { searchInputRef } = useKeyboardShortcuts({
    lens,
    onLensChange: setLens,
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    showFilters,
    onToggleFilters: () => setShowFilters(!showFilters),
    showKeyboardShortcuts,
    onToggleKeyboardShortcuts: () => setShowKeyboardShortcuts(!showKeyboardShortcuts),
    showAgentModal,
    onCloseAgentModal: () => setShowAgentModal(false),
    onRefresh: refetch
  })

  // Generate what-if scenarios
  const whatIfScenarios = useMemo(() => {
    return initiatives ? generateWhatIfScenarios(initiatives) : []
  }, [initiatives])

  // Generate strategic insights
  const insights = useMemo(() => {
    if (!season || !initiatives || !myTasks) return null
    return generateStrategicInsights(season, initiatives, [...myTasks, ...(agentTasks || [])])
  }, [season, initiatives, myTasks, agentTasks])

  // Memoized functions for performance
  const progressIntentCallback = useCallback(progressIntent, [])

  // Handle initiative updates
  const handleInitiativeUpdated = useCallback((updatedInitiative: any) => {
    // Refresh the dashboard to get the latest data
    refetch()
  }, [refetch])

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
      // Get the first initiative as a fallback
      const defaultInitiative = initiatives?.[0]

      if (!defaultInitiative) {
        alert('No initiatives found. Please create an initiative first to add tasks.')
        return
      }

      await createTask({
        type: 'task',
        initiativeId: defaultInitiative.id,
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
      alert(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const sendToAgent = async (agentId: string) => {
    if (!scratch.trim()) return

    try {
      // Get the first initiative as a fallback
      const defaultInitiative = initiatives?.[0]

      if (!defaultInitiative) {
        alert('No initiatives found. Please create an initiative first to add tasks.')
        return
      }

      // First create the task
      const newTask = await createTask({
        type: 'task',
        initiativeId: defaultInitiative.id,
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
      alert(`Failed to delegate task to agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
      <PageHeader 
        onRefresh={refetch} 
        onInitiativeCreated={() => refetch()} 
        seasonId={season?.id}
      />

      {/* Search & Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        onClearFilters={clearFilters}
        onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
      />

      {/* Page Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Season Goal */}
          <SeasonGoalCard season={season} progressIntent={progressIntentCallback} />

          {/* Strategic Insights */}
          <StrategicInsightsCard insights={insights} />

          {/* Strategic Lenses */}
          <StrategicLenses
            lens={lens}
            onLensChange={setLens}
            filteredInitiatives={filteredInitiatives}
            filteredMyTasks={filteredMyTasks}
            filteredAgentTasks={filteredAgentTasks}
            agents={agents}
            recentMemories={recentMemories}
            reflectionContent={reflectionContent}
            onReflectionContentChange={setReflectionContent}
            onSaveReflection={saveReflection}
            progressIntentCallback={progressIntentCallback}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            categoryFilter={categoryFilter}
            onInitiativeUpdated={handleInitiativeUpdated}
          />

          {/* Strategic Map */}
          <StrategicMapCard season={season} initiatives={initiatives} />
        </div>

        {/* Right Rail */}
        <div className="space-y-4">
          {/* Daily Tracking */}
          <DailyTrackingCard
            onOpenDailyModal={(view) => {
              setDailyModalView(view)
              setShowDailyModal(true)
            }}
            planning={{
              data: planningState.data,
              loading: planningState.loading,
              error: planningState.error,
            }}
            reflection={{
              data: reflectionState.data,
              loading: reflectionState.loading,
              error: reflectionState.error,
            }}
          />

          {/* Scratchpad */}
          <Scratchpad
            scratch={scratch}
            onScratchChange={setScratch}
            onPromoteToTask={promoteToTask}
            onShowAgentModal={() => setShowAgentModal(true)}
          />

          {/* What-If Simulator */}
          <WhatIfSimulator
            whatIfAutoRebalance={whatIfAutoRebalance}
            onAutoRebalanceChange={setWhatIfAutoRebalance}
            whatIfScenarios={whatIfScenarios}
            selectedScenario={selectedScenario}
            onScenarioSelect={setSelectedScenario}
          />

          {/* Quick Actions */}
          <QuickActions />
        </div>
      </div>

      {/* Modals */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      <AgentSelectionModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        agents={agents || []}
        onAgentSelect={sendToAgent}
      />

      {/* Daily Planning and Reflection Modals - controlled by DailyTrackingCard */}
      <DailyRhythmModal
        isOpen={showDailyModal}
        initialView={dailyModalView}
        onClose={() => {
          setShowDailyModal(false)
          setDailyTrackingRefresh(prev => prev + 1)
        }}
        seasonId={season?.id}
      />
    </div>
  )
}
