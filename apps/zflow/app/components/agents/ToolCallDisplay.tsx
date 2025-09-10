'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Loader, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { ToolCall } from './AgentChatWindow'

interface ToolCallDisplayProps {
  toolCall: ToolCall
}

export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'pending':
        return <Clock size={14} className="text-gray-500" />
      case 'running':
        return <Loader size={14} className="text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle size={14} className="text-green-500" />
      case 'error':
        return <XCircle size={14} className="text-red-500" />
      default:
        return <Clock size={14} className="text-gray-500" />
    }
  }

  const getToolIcon = (toolName: string) => {
    switch (toolName.toLowerCase()) {
      case 'createtask':
      case 'create_task':
        return '📋'
      case 'searchtasks':
      case 'search_tasks':
        return '🔍'
      case 'getmemories':
      case 'get_memories':
        return '🧠'
      case 'savememory':
      case 'save_memory':
        return '💾'
      case 'web_search':
      case 'websearch':
        return '🌐'
      case 'code_execution':
      case 'execute_code':
        return '💻'
      default:
        return '⚡'
    }
  }

  const formatToolName = (name: string) => {
    // Convert snake_case to Title Case
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const formatParameters = (params: any) => {
    if (!params) return 'No parameters'
    
    if (typeof params === 'string') return params
    
    try {
      return JSON.stringify(params, null, 2)
    } catch {
      return String(params)
    }
  }

  const formatResult = (result: any) => {
    if (!result) return 'No result'
    
    if (typeof result === 'string') return result
    
    try {
      return JSON.stringify(result, null, 2)
    } catch {
      return String(result)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg">{getToolIcon(toolCall.name)}</span>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">
              {formatToolName(toolCall.name)}
            </span>
            {getStatusIcon()}
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-600" />
          ) : (
            <ChevronRight size={16} className="text-gray-600" />
          )}
        </button>
      </div>

      {/* Status message */}
      <div className="mt-2 text-sm text-gray-600">
        {toolCall.status === 'pending' && 'Queued for execution...'}
        {toolCall.status === 'running' && 'Executing...'}
        {toolCall.status === 'completed' && 'Completed successfully'}
        {toolCall.status === 'error' && 'Execution failed'}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
          {/* Parameters */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Parameters:</h4>
            <pre className="text-xs bg-white border border-gray-200 rounded p-2 overflow-x-auto text-gray-800">
              {formatParameters(toolCall.parameters)}
            </pre>
          </div>

          {/* Result */}
          {(toolCall.status === 'completed' || toolCall.status === 'error') && toolCall.result && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Result:</h4>
              <pre className={`text-xs border rounded p-2 overflow-x-auto ${
                toolCall.status === 'error' 
                  ? 'bg-red-50 border-red-200 text-red-800' 
                  : 'bg-white border-gray-200 text-gray-800'
              }`}>
                {formatResult(toolCall.result)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}