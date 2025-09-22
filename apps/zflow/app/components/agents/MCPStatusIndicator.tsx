'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Zap,
  Database,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface MCPStatus {
  success: boolean
  timestamp: string
  system: {
    initialized: boolean
    mcpAvailable: boolean
    availableAgents: string[]
    availableProviders: string[]
  }
  mcp: {
    connected: boolean
    bridgeInitialized: boolean
    availableTools: string[]
    registeredProviders: string[]
    error: string | null
  }
}

interface MCPStatusIndicatorProps {
  className?: string
}

export default function MCPStatusIndicator({ className = '' }: MCPStatusIndicatorProps) {
  const [status, setStatus] = useState<MCPStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/agents/mcp/status')
      const data = await response.json()

      if (data.success) {
        setStatus(data)
        setError(null)
        setLastUpdated(new Date())
      } else {
        setError(data.error || 'Failed to fetch MCP status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()

    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
    if (error) return <XCircle className="w-4 h-4 text-red-500" />
    if (!status?.mcp.connected) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    return <CheckCircle className="w-4 h-4 text-green-500" />
  }

  const getStatusText = () => {
    if (loading) return 'Checking MCP status...'
    if (error) return 'MCP unavailable'
    if (!status?.mcp.connected) return 'MCP disconnected'
    return `${status.mcp.availableTools.length} tools available`
  }

  const getStatusColor = () => {
    if (loading) return 'border-blue-200 bg-blue-50'
    if (error) return 'border-red-200 bg-red-50'
    if (!status?.mcp.connected) return 'border-yellow-200 bg-yellow-50'
    return 'border-green-200 bg-green-50'
  }

  return (
    <div className={`${className}`}>
      {/* Compact Status Indicator */}
      <div
        className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${getStatusColor()}`}
        onClick={() => setExpanded(!expanded)}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium text-gray-700">
          {getStatusText()}
        </span>
        {status && (
          <button className="text-gray-500 hover:text-gray-700">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Expanded Status Details */}
      {expanded && status && (
        <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-primary-600" />
                MCP Integration Status
              </h3>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Connection Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Database className="w-4 h-4 mr-2 text-blue-600" />
                  Connection
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>MCP Server</span>
                    <div className="flex items-center">
                      {status.mcp.connected ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={status.mcp.connected ? 'text-green-600' : 'text-red-600'}>
                        {status.mcp.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Bridge</span>
                    <div className="flex items-center">
                      {status.mcp.bridgeInitialized ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={status.mcp.bridgeInitialized ? 'text-green-600' : 'text-red-600'}>
                        {status.mcp.bridgeInitialized ? 'Initialized' : 'Not Ready'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-purple-600" />
                  Tools & Providers
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Available Tools</span>
                    <span className="font-semibold text-primary-600">
                      {status.mcp.availableTools.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Registered Providers</span>
                    <span className="font-semibold text-purple-600">
                      {status.mcp.registeredProviders.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tool Categories */}
            {status.mcp.availableTools.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-emerald-600" />
                  Tool Categories
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {getToolCategories(status.mcp.availableTools).map(category => (
                    <div key={category.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <span className="text-gray-700">{category.name}</span>
                      <span className="font-semibold text-gray-900">{category.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Providers */}
            {status.mcp.registeredProviders.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Active Providers</h4>
                <div className="flex flex-wrap gap-2">
                  {status.mcp.registeredProviders.map(provider => (
                    <span
                      key={provider}
                      className="inline-flex items-center px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-md"
                    >
                      {provider}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {status.mcp.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-sm font-medium text-red-800">Error</span>
                </div>
                <p className="mt-1 text-sm text-red-700">{status.mcp.error}</p>
              </div>
            )}

            {/* Last Updated */}
            {lastUpdated && (
              <div className="text-xs text-gray-500 text-center">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to categorize tools
function getToolCategories(tools: string[]) {
  const categories = {
    'Authentication': tools.filter(t => ['authenticate', 'get_auth_status', 'set_access_token', 'exchange_code_for_token', 'refresh_token', 'get_user_info', 'clear_auth'].includes(t)).length,
    'Memory': tools.filter(t => t.includes('memor')).length,
    'Tasks': tools.filter(t => t.includes('task')).length,
    'Activities': tools.filter(t => t.includes('activit')).length,
    'Timeline': tools.filter(t => t.includes('timeline')).length,
    'Categories': tools.filter(t => t.includes('categor')).length,
    'AI Tasks': tools.filter(t => t.includes('ai_task')).length,
    'Other': 0
  }

  // Calculate "Other" category
  const categorizedCount = Object.values(categories).reduce((sum, count) => sum + count, 0) - categories['Other']
  categories['Other'] = tools.length - categorizedCount

  return Object.entries(categories)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}