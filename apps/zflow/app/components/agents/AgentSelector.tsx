'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Agent {
  id: string
  name: string
  description: string
  status: 'online' | 'offline' | 'busy'
}

interface AgentSelectorProps {
  selectedAgent: string
  availableAgents: Agent[]
  onAgentChange: (agentId: string) => void
  disabled?: boolean
}

export function AgentSelector({
  selectedAgent,
  availableAgents,
  onAgentChange,
  disabled = false
}: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedAgentData = availableAgents.find(agent => agent.id === selectedAgent)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAgentSelect = (agentId: string) => {
    onAgentChange(agentId)
    setIsOpen(false)
  }

  const getAgentIcon = (agentId: string) => {
    switch (agentId.toLowerCase()) {
      case 'gpt-4':
        return '🧠'
      case 'claude':
        return '🎭'
      case 'bedrock':
        return '⛰️'
      default:
        return '🤖'
    }
  }

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500'
      case 'busy':
        return 'bg-yellow-500'
      case 'offline':
        return 'bg-gray-400'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center space-x-2 px-3 py-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl hover:bg-white hover:shadow-md focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 transition-all duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="text-lg">{getAgentIcon(selectedAgent)}</span>
        <span className="font-medium text-gray-900 text-sm sm:text-base">
          {selectedAgentData?.name || 'Agent'}
        </span>
        <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedAgentData?.status || 'offline')}`} />
        <ChevronDown 
          size={14} 
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
          <div className="py-1">
            {availableAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleAgentSelect(agent.id)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{getAgentIcon(agent.id)}</span>
                    <span className="font-medium text-gray-900 text-sm">{agent.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(agent.status)}`} />
                    {selectedAgent === agent.id && (
                      <Check size={14} className="text-primary-600" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
