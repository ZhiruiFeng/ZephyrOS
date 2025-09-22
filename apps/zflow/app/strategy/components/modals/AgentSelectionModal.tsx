import React from 'react'
import { Bot } from 'lucide-react'
import { Button } from '../ui'

interface Agent {
  id: string
  name: string
  specialties?: string[]
}

interface AgentSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  agents: any
  onAgentSelect: (agentId: string) => void
}

export const AgentSelectionModal = ({
  isOpen,
  onClose,
  agents,
  onAgentSelect
}: AgentSelectionModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Send to Agent</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Choose an AI agent to break down or execute.
        </p>
        <div className="space-y-3">
          {agents?.map((agent: any) => (
            <Button
              key={agent.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onAgentSelect(agent.id)
                onClose()
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
  )
}
