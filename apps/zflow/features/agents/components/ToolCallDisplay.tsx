'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Loader, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { ToolCall } from '../types/agents'

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
    const name = toolName.toLowerCase()

    // Task management tools
    if (name.includes('task')) {
      if (name.includes('create')) return '➕'
      if (name.includes('search') || name.includes('get')) return '🔍'
      if (name.includes('update')) return '✏️'
      if (name.includes('delete')) return '🗑️'
      return '📋'
    }

    // Memory tools
    if (name.includes('memory') || name.includes('memories')) {
      if (name.includes('add') || name.includes('create')) return '💾'
      if (name.includes('search') || name.includes('get')) return '🧠'
      if (name.includes('update')) return '✏️'
      return '🧠'
    }

    // Activity tools
    if (name.includes('activity') || name.includes('activities')) {
      if (name.includes('create')) return '🏃'
      if (name.includes('search')) return '📊'
      return '⚡'
    }

    // Habit tools
    if (name.includes('habit')) {
      return '🎯'
    }

    // Auth tools
    if (name.includes('auth') || name.includes('token')) {
      return '🔐'
    }

    // System tools
    if (name.includes('system') || name.includes('status')) {
      return '⚙️'
    }

    // Web/search tools
    if (name.includes('web') || name.includes('search')) {
      return '🌐'
    }

    // Code execution
    if (name.includes('code') || name.includes('execute')) {
      return '💻'
    }

    return '🔧'
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

  const getStatusColor = () => {
    switch (toolCall.status) {
      case 'running':
        return 'border-blue-300 bg-blue-50'
      case 'completed':
        return 'border-green-300 bg-green-50'
      case 'error':
        return 'border-red-300 bg-red-50'
      default:
        return 'border-gray-300 bg-gray-50'
    }
  }

  return (
    <div className={`border-2 rounded-xl p-3 transition-all duration-200 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <span className="text-2xl">{getToolIcon(toolCall.name)}</span>
          <div className="flex flex-col flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900 text-sm">
                {formatToolName(toolCall.name)}
              </span>
              {getStatusIcon()}
            </div>
            {/* Status message */}
            <div className={`text-xs mt-0.5 font-medium ${
              toolCall.status === 'running' ? 'text-blue-700' :
              toolCall.status === 'completed' ? 'text-green-700' :
              toolCall.status === 'error' ? 'text-red-700' :
              'text-gray-600'
            }`}>
              {toolCall.status === 'pending' && '⏳ Queued for execution...'}
              {toolCall.status === 'running' && '⚡ Executing MCP tool...'}
              {toolCall.status === 'completed' && '✅ Completed successfully'}
              {toolCall.status === 'error' && '❌ Execution failed'}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            toolCall.status === 'running' ? 'hover:bg-blue-100' :
            toolCall.status === 'completed' ? 'hover:bg-green-100' :
            toolCall.status === 'error' ? 'hover:bg-red-100' :
            'hover:bg-gray-200'
          }`}
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-600" />
          ) : (
            <ChevronRight size={16} className="text-gray-600" />
          )}
        </button>
      </div>

      {/* Quick result summary (when not expanded) */}
      {!isExpanded && toolCall.status === 'completed' && toolCall.result && (
        <div className="mt-2 text-xs text-green-800 bg-green-100/50 rounded-lg p-2 border border-green-200">
          <span className="font-medium">Result: </span>
          <span className="line-clamp-2">{typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result).slice(0, 100) + '...'}</span>
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 space-y-3 border-t border-gray-300 pt-3">
          {/* Parameters */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Input Parameters</h4>
            <pre className="text-xs bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto text-gray-800 shadow-sm">
              {formatParameters(toolCall.parameters)}
            </pre>
          </div>

          {/* Result */}
          {(toolCall.status === 'completed' || toolCall.status === 'error') && toolCall.result && (
            <div>
              <h4 className={`text-xs font-semibold mb-1.5 uppercase tracking-wide ${
                toolCall.status === 'error' ? 'text-red-700' : 'text-green-700'
              }`}>
                {toolCall.status === 'error' ? 'Error Details' : 'Tool Output'}
              </h4>
              <pre className={`text-xs border rounded-lg p-3 overflow-x-auto shadow-sm ${
                toolCall.status === 'error'
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-white border-green-300 text-gray-800'
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