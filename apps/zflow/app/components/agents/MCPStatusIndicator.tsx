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
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screens
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    if (loading) return isMobile ? 'Checking...' : 'Checking MCP status...'
    if (error) return isMobile ? 'Unavailable' : 'MCP unavailable'
    if (!status?.mcp.connected) return isMobile ? 'Disconnected' : 'MCP disconnected'
    return isMobile ? `${status.mcp.availableTools.length} tools` : `${status.mcp.availableTools.length} tools available`
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
        className={`inline-flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${getStatusColor()}`}
        onClick={() => setExpanded(!expanded)}
      >
        {getStatusIcon()}
        <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
          {getStatusText()}
        </span>
        {status && !isMobile && (
          <button className="text-gray-500 hover:text-gray-700 flex-shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
        {status && isMobile && (
          <div className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></div>
        )}
      </div>

      {/* Expanded Status Details */}
      {expanded && status && (
        <div className={`mt-3 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg shadow-lg ${isMobile ? 'fixed inset-x-4 top-20 z-50 max-h-[70vh] overflow-y-auto' : 'absolute z-10 min-w-96'}`}>
          <div className="space-y-3 sm:space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary-600" />
                MCP Service Configuration
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchStatus}
                  disabled={loading}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                {isMobile && (
                  <button
                    onClick={() => setExpanded(false)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-2 sm:p-3 rounded-lg border border-blue-200">
                <div className="text-xs sm:text-sm text-blue-600 font-medium">Connection</div>
                <div className="text-sm sm:text-base font-bold text-blue-800">
                  {status.mcp.connected ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-2 sm:p-3 rounded-lg border border-purple-200">
                <div className="text-xs sm:text-sm text-purple-600 font-medium">Tools</div>
                <div className="text-sm sm:text-base font-bold text-purple-800">
                  {status.mcp.availableTools.length}
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-2 sm:p-3 rounded-lg border border-emerald-200">
                <div className="text-xs sm:text-sm text-emerald-600 font-medium">Providers</div>
                <div className="text-sm sm:text-base font-bold text-emerald-800">
                  {status.mcp.registeredProviders.length}
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-2 sm:p-3 rounded-lg border border-amber-200">
                <div className="text-xs sm:text-sm text-amber-600 font-medium">Agents</div>
                <div className="text-sm sm:text-base font-bold text-amber-800">
                  {status.system.availableAgents.length}
                </div>
              </div>
            </div>

            {/* Service Status Overview */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 flex items-center mb-2">
                <Database className="w-4 h-4 mr-2 text-blue-600" />
                Service Status
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">MCP Server</span>
                  <div className="flex items-center">
                    {status.mcp.connected ? (
                      <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs font-medium ${status.mcp.connected ? 'text-green-600' : 'text-red-600'}`}>
                      {status.mcp.connected ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Bridge</span>
                  <div className="flex items-center">
                    {status.mcp.bridgeInitialized ? (
                      <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs font-medium ${status.mcp.bridgeInitialized ? 'text-green-600' : 'text-red-600'}`}>
                      {status.mcp.bridgeInitialized ? 'Ready' : 'Error'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Providers */}
            {status.mcp.registeredProviders.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Zap className="w-4 h-4 mr-2 text-purple-600" />
                  Connected Services
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {status.mcp.registeredProviders.map(provider => (
                    <div
                      key={provider}
                      className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-md"
                    >
                      <span className="text-sm font-medium text-purple-800 capitalize">
                        {provider.replace(/[-_]/g, ' ')}
                      </span>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse mr-2"></div>
                        <span className="text-xs text-purple-600">Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tool Categories */}
            {status.mcp.availableTools.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-emerald-600" />
                  Available Tool Types
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {getToolCategories(status.mcp.availableTools).slice(0, 6).map(category => (
                    <div key={category.name} className="flex items-center justify-between p-2 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-md">
                      <span className="text-xs sm:text-sm text-emerald-700 font-medium truncate">{category.name}</span>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-200 px-1.5 py-0.5 rounded-full">{category.count}</span>
                    </div>
                  ))}
                </div>
                {getToolCategories(status.mcp.availableTools).length > 6 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{getToolCategories(status.mcp.availableTools).length - 6} more categories
                  </div>
                )}
              </div>
            )}

            {/* System Agents */}
            {status.system.availableAgents.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-amber-600" />
                  Available Agents
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {status.system.availableAgents.slice(0, 5).map(agent => (
                    <span
                      key={agent}
                      className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 text-xs font-medium rounded-md border border-amber-300"
                    >
                      {agent.replace(/[-_]/g, ' ')}
                    </span>
                  ))}
                  {status.system.availableAgents.length > 5 && (
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md border border-gray-300">
                      +{status.system.availableAgents.length - 5} more
                    </span>
                  )}
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