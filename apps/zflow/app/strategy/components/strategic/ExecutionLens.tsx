import React from 'react'
import { ClipboardCheck, Bot } from 'lucide-react'
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
              <div className="text-center py-4 text-gray-500 text-sm">
                {hasActiveFilters
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
                {hasActiveFilters
                  ? 'No agent tasks match your search criteria.'
                  : 'No tasks delegated to agents'
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
