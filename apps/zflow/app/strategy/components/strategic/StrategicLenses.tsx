import React from 'react'
import { Brain, Eye, ClipboardCheck, Bot, Lightbulb } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui'
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
  const lensTabs = [
    { id: 'vision', label: 'Vision', shortLabel: 'Vision', icon: Eye, shortcut: '1' },
    { id: 'execution', label: 'Execution', shortLabel: 'Exec', icon: ClipboardCheck, shortcut: '2' },
    { id: 'delegation', label: 'AI Delegation', shortLabel: 'AI', icon: Bot, shortcut: '3' },
    { id: 'reflection', label: 'Reflection', shortLabel: 'Reflect', icon: Lightbulb, shortcut: '4' }
  ]

  const hasActiveFilters = Boolean(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all')

  return (
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
        {lens === 'vision' && (
          <VisionLens
            filteredInitiatives={filteredInitiatives}
            progressIntentCallback={progressIntentCallback}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {lens === 'execution' && (
          <ExecutionLens
            filteredMyTasks={filteredMyTasks}
            filteredAgentTasks={filteredAgentTasks}
            progressIntentCallback={progressIntentCallback}
            hasActiveFilters={hasActiveFilters}
          />
        )}

        {lens === 'delegation' && (
          <DelegationLens agents={agents} />
        )}

        {lens === 'reflection' && (
          <ReflectionLens
            reflectionContent={reflectionContent}
            onReflectionContentChange={onReflectionContentChange}
            onSaveReflection={onSaveReflection}
            recentMemories={recentMemories}
          />
        )}
      </CardContent>
    </Card>
  )
}
