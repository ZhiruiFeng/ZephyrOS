import React from 'react'
import { Bot, Send } from 'lucide-react'
import { Badge, Button } from '../ui'

interface Agent {
  id: string
  name: string
  status: string
  availability?: string
  specialties?: string[]
  workload?: {
    inProgressTasks: number
    totalTasks: number
  }
}

interface AgentCardProps {
  agent: Agent
}

export const AgentCard = React.memo(function AgentCard({
  agent
}: AgentCardProps) {
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
