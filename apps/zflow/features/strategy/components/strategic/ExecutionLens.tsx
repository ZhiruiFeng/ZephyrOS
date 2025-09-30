import React from 'react'
import { ClipboardCheck, Bot, CheckCircle2, Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui'
import { TaskCard, AgentTaskCard } from '../business'

interface ExecutionLensProps {
  filteredMyTasks: any[]
  filteredAgentTasks: any[]
  progressIntentCallback: (p: number) => string
  hasActiveFilters: boolean
}

export const ExecutionLens = ({
  filteredMyTasks,
  filteredAgentTasks,
  progressIntentCallback,
  hasActiveFilters
}: ExecutionLensProps) => {
  return (
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
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="w-12 h-12 mb-3 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {hasActiveFilters
                    ? 'No matching tasks found.'
                    : 'All clear! No pending tasks.'}
                </p>
                {!hasActiveFilters && (
                  <p className="text-xs text-gray-500 mt-1">You're doing great! 🎉</p>
                )}
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
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="w-12 h-12 mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-orange-600" />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {hasActiveFilters
                    ? 'No matching agent tasks.'
                    : 'No tasks delegated to agents yet'}
                </p>
                {!hasActiveFilters && (
                  <p className="text-xs text-gray-500 mt-1">Delegate tasks to scale your work</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
