import React from 'react'
import { Brain, Eye, ClipboardCheck, Bot, Lightbulb, Maximize2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui'
import { FullscreenModal, useFullscreenModal } from '../modals/FullscreenModal'
import { VisionLens } from './VisionLens'
import { ExecutionLens } from './ExecutionLens'
import { DelegationLens } from './DelegationLens'
import { ReflectionLens } from './ReflectionLens'
import type { StrategyLens } from '../../../../lib/types/strategy'

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
  categoryFilter
}: StrategicLensesProps) => {
  const fullscreen = useFullscreenModal()

  const lensTabs = [
    { id: 'vision', label: 'Vision', shortLabel: 'Vision', icon: Eye, shortcut: '1' },
    { id: 'execution', label: 'Execution', shortLabel: 'Exec', icon: ClipboardCheck, shortcut: '2' },
    { id: 'delegation', label: 'AI Delegation', shortLabel: 'AI', icon: Bot, shortcut: '3' },
    { id: 'reflection', label: 'Reflection', shortLabel: 'Reflect', icon: Lightbulb, shortcut: '4' }
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
        {/* Strategic Lens Navigation - Mobile Optimized */}
        <div className="mb-6">
          <div className="flex overflow-x-auto scrollbar-hide space-x-1 bg-gray-100 p-1 rounded-lg">
            {lensTabs.map(({ id, label, shortLabel, icon: Icon, shortcut }) => (
              <button
                key={id}
                onClick={() => onLensChange(id as StrategyLens)}
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
