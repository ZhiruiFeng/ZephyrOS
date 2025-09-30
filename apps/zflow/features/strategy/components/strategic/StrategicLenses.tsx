import React from 'react'
import { Brain, Eye, ClipboardCheck, Bot, Lightbulb, Maximize2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui'
import { FullscreenModal, useFullscreenModal } from '../modals/FullscreenModal'
import { VisionLens } from './VisionLens'
import { ExecutionLens } from './ExecutionLens'
import { DelegationLens } from './DelegationLens'
import { ReflectionLens } from './ReflectionLens'
import type { StrategyLens } from '../../types/strategy'

interface StrategicLensesProps {
  lens: StrategyLens
  onLensChange: (lens: StrategyLens) => void
  filteredInitiatives: any[]
  filteredMyTasks: any[]
  filteredAgentTasks: any[]
  agents: any
  recentMemories: any
  reflectionContent: string
  onReflectionContentChange: (content: string) => void
  onSaveReflection: () => void
  progressIntentCallback: (p: number) => string
  searchQuery: string
  statusFilter: string
  priorityFilter: string
  categoryFilter: string
  onInitiativeUpdated?: (initiative: any) => void
}

export const StrategicLenses = ({
  lens,
  onLensChange,
  filteredInitiatives,
  filteredMyTasks,
  filteredAgentTasks,
  agents,
  recentMemories,
  reflectionContent,
  onReflectionContentChange,
  onSaveReflection,
  progressIntentCallback,
  searchQuery,
  statusFilter,
  priorityFilter,
  categoryFilter,
  onInitiativeUpdated
}: StrategicLensesProps) => {
  const fullscreen = useFullscreenModal()

  // Calculate metrics for each lens
  const visionCount = filteredInitiatives.length
  const executionCount = filteredMyTasks.length + filteredAgentTasks.length
  const delegationCount = filteredAgentTasks.length
  const reflectionCount = recentMemories?.length || 0

  const lensTabs = [
    {
      id: 'vision',
      label: 'Vision',
      shortLabel: 'Vision',
      icon: Eye,
      shortcut: '1',
      count: visionCount,
      color: 'blue',
      description: 'Strategic initiatives'
    },
    {
      id: 'execution',
      label: 'Execution',
      shortLabel: 'Exec',
      icon: ClipboardCheck,
      shortcut: '2',
      count: executionCount,
      color: 'green',
      description: 'Active tasks'
    },
    {
      id: 'delegation',
      label: 'AI Delegation',
      shortLabel: 'AI',
      icon: Bot,
      shortcut: '3',
      count: delegationCount,
      color: 'orange',
      description: 'Agent tasks'
    },
    {
      id: 'reflection',
      label: 'Reflection',
      shortLabel: 'Reflect',
      icon: Lightbulb,
      shortcut: '4',
      count: reflectionCount,
      color: 'purple',
      description: 'Recent memories'
    }
  ]

  const hasActiveFilters = Boolean(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all')

  const renderLensContent = () => {
    switch (lens) {
      case 'vision':
        return (
          <VisionLens
            filteredInitiatives={filteredInitiatives}
            progressIntentCallback={progressIntentCallback}
            hasActiveFilters={hasActiveFilters}
            onInitiativeUpdated={onInitiativeUpdated}
          />
        )
      case 'execution':
        return (
          <ExecutionLens
            filteredMyTasks={filteredMyTasks}
            filteredAgentTasks={filteredAgentTasks}
            progressIntentCallback={progressIntentCallback}
            hasActiveFilters={hasActiveFilters}
          />
        )
      case 'delegation':
        return <DelegationLens agents={agents} />
      case 'reflection':
        return (
          <ReflectionLens
            reflectionContent={reflectionContent}
            onReflectionContentChange={onReflectionContentChange}
            onSaveReflection={onSaveReflection}
            recentMemories={recentMemories}
          />
        )
      default:
        return null
    }
  }

  const currentLensTab = lensTabs.find(tab => tab.id === lens)

  return (
    <>
      <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white via-purple-50/20 to-white border-0 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Strategic Lenses
              </CardTitle>
              <CardDescription>
                Switch between CEO views: vision, execution, delegation, reflection.
              </CardDescription>
            </div>
            <button
              onClick={fullscreen.open}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="View fullscreen"
              aria-label="View fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
      <CardContent>
        {/* Strategic Lens Navigation - Enhanced Card-Style Tabs */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {lensTabs.map(({ id, label, shortLabel, icon: Icon, shortcut, count, color, description }) => {
              const isActive = lens === id

              // Color mappings
              const colorClasses = {
                blue: {
                  active: 'bg-blue-50 border-blue-300 text-blue-700',
                  inactive: 'bg-white border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-50/50',
                  icon: 'text-blue-600',
                  badge: 'bg-blue-100 text-blue-700'
                },
                green: {
                  active: 'bg-green-50 border-green-300 text-green-700',
                  inactive: 'bg-white border-gray-200 text-gray-600 hover:border-green-200 hover:bg-green-50/50',
                  icon: 'text-green-600',
                  badge: 'bg-green-100 text-green-700'
                },
                orange: {
                  active: 'bg-orange-50 border-orange-300 text-orange-700',
                  inactive: 'bg-white border-gray-200 text-gray-600 hover:border-orange-200 hover:bg-orange-50/50',
                  icon: 'text-orange-600',
                  badge: 'bg-orange-100 text-orange-700'
                },
                purple: {
                  active: 'bg-purple-50 border-purple-300 text-purple-700',
                  inactive: 'bg-white border-gray-200 text-gray-600 hover:border-purple-200 hover:bg-purple-50/50',
                  icon: 'text-purple-600',
                  badge: 'bg-purple-100 text-purple-700'
                }
              }

              const colors = colorClasses[color as keyof typeof colorClasses]

              return (
                <button
                  key={id}
                  onClick={() => onLensChange(id as StrategyLens)}
                  className={`group flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 ${
                    isActive ? colors.active : colors.inactive
                  }`}
                  title={`${label} (Press ${shortcut})`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <Icon className={`h-5 w-5 ${isActive ? colors.icon : 'text-gray-400 group-hover:' + colors.icon}`} />
                    {count > 0 && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isActive ? colors.badge : 'bg-gray-100 text-gray-600'
                      }`}>
                        {count}
                      </span>
                    )}
                  </div>
                  <div className="text-left w-full">
                    <div className="font-semibold text-sm mb-0.5">
                      <span className="hidden md:inline">{label}</span>
                      <span className="md:hidden">{shortLabel}</span>
                    </div>
                    <div className={`text-xs ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                      {description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        {renderLensContent()}
      </CardContent>
    </Card>

    <FullscreenModal
      isOpen={fullscreen.isOpen}
      onClose={fullscreen.close}
      title={`Strategic Lenses - ${currentLensTab?.label || 'Unknown'}`}
      icon={currentLensTab ? <currentLensTab.icon className="w-6 h-6 text-purple-600" /> : <Brain className="w-6 h-6 text-purple-600" />}
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Strategic {currentLensTab?.label} View</h3>
          <p className="text-gray-600">
            {lens === 'vision' && 'Focus on long-term initiatives and strategic direction.'}
            {lens === 'execution' && 'Monitor task execution and operational progress.'}
            {lens === 'delegation' && 'Manage AI agent delegation and collaboration.'}
            {lens === 'reflection' && 'Reflect on progress and capture strategic insights.'}
          </p>
        </div>

        {/* Full lens navigation in fullscreen */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Switch Lens</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {lensTabs.map(({ id, label, icon: Icon, shortcut }) => (
              <button
                key={id}
                onClick={() => onLensChange(id as StrategyLens)}
                className={`flex items-center gap-3 p-4 rounded-lg border transition-all duration-200 ${
                  lens === id
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">{label}</div>
                  <div className="text-xs opacity-70">Press {shortcut}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced content area */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          {renderLensContent()}
        </div>
      </div>
    </FullscreenModal>
  </>
  )
}
