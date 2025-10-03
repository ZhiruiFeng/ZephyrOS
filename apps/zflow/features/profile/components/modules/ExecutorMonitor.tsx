'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server,
  Folder,
  Activity,
  FileCode,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Circle,
  ChevronRight,
  RefreshCw,
  Cpu,
  HardDrive,
  Network,
  Loader2,
  Maximize2,
  Terminal,
  FileText,
  Zap,
  TrendingUp
} from 'lucide-react'
import {
  useExecutorDevices,
  useExecutorWorkspaces,
  useWorkspaceEvents,
  useWorkspaceArtifacts,
  useWorkspaceMetrics
} from '@/hooks/useExecutor'
import type {
  ExecutorDevice,
  ExecutorWorkspace,
  ExecutorWorkspaceEvent
} from '@/lib/api/executor-api'

// =====================================================
// HELPER COMPONENTS
// =====================================================

interface StatusBadgeProps {
  status: string
  online?: boolean
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, online }) => {
  const getStatusColor = () => {
    if (online === false) return 'bg-gray-500'

    switch (status) {
      case 'active':
      case 'online':
      case 'running':
      case 'completed':
        return 'bg-green-500'
      case 'ready':
      case 'assigned':
        return 'bg-blue-500'
      case 'initializing':
      case 'creating':
      case 'cloning':
      case 'starting':
        return 'bg-yellow-500'
      case 'failed':
      case 'error':
      case 'timeout':
        return 'bg-red-500'
      case 'paused':
      case 'maintenance':
        return 'bg-orange-500'
      case 'inactive':
      case 'disabled':
      case 'archived':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
      <span className="text-sm font-medium capitalize">{status}</span>
    </div>
  )
}

interface DeviceCardProps {
  device: ExecutorDevice
  onClick: () => void
  isSelected: boolean
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onClick, isSelected }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">{device.device_name}</h3>
        </div>
        <StatusBadge status={device.status} online={device.is_online} />
      </div>

      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="capitalize">{device.platform}</span>
          {device.os_version && <span>• {device.os_version}</span>}
        </div>

        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4" />
          <span>{device.current_workspaces_count} / {device.max_concurrent_workspaces} workspaces</span>
        </div>

        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          <span>{device.current_disk_usage_gb}GB / {device.max_disk_usage_gb}GB</span>
        </div>

        {device.last_heartbeat_at && (
          <div className="flex items-center gap-2 text-xs">
            <Activity className="w-3 h-3" />
            <span>Last seen: {new Date(device.last_heartbeat_at).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface WorkspaceCardProps {
  workspace: ExecutorWorkspace
  onClick: () => void
  isSelected: boolean
}

const WorkspaceCard: React.FC<WorkspaceCardProps> = ({ workspace, onClick, isSelected }) => {
  const getProgressColor = () => {
    if (workspace.progress_percentage >= 100) return 'bg-green-500'
    if (workspace.progress_percentage >= 50) return 'bg-blue-500'
    return 'bg-yellow-500'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-sm">{workspace.workspace_name}</span>
        </div>
        <StatusBadge status={workspace.status} />
      </div>

      {workspace.current_phase && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
          {workspace.current_phase}
        </div>
      )}

      {workspace.progress_percentage > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>Progress</span>
            <span>{workspace.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${workspace.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          <span>{(workspace.disk_usage_bytes / 1024 / 1024).toFixed(1)}MB</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          <span>{workspace.file_count} files</span>
        </div>
      </div>
    </motion.div>
  )
}

interface EventListProps {
  events: ExecutorWorkspaceEvent[]
}

const EventList: React.FC<EventListProps> = ({ events }) => {
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <Circle className="w-4 h-4 text-blue-500" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No events yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.slice(0, 20).map((event) => (
        <div
          key={event.id}
          className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-start gap-3">
            {getLevelIcon(event.level)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {event.event_type}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(event.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{event.message}</p>
              {event.source && (
                <span className="text-xs text-gray-500 mt-1 block">Source: {event.source}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface ExecutorMonitorProps {
  config?: any
  onConfigChange?: (config: any) => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  fullScreenPath?: string
}

export function ExecutorMonitor({
  config,
  onConfigChange,
  isFullscreen = false,
  onToggleFullscreen,
  fullScreenPath
}: ExecutorMonitorProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  // Fetch data
  const { devices, isLoading: devicesLoading, refresh: refreshDevices } = useExecutorDevices()
  const { workspaces, isLoading: workspacesLoading, refresh: refreshWorkspaces } = useExecutorWorkspaces(
    selectedDeviceId ? { executor_device_id: selectedDeviceId } : undefined
  )
  const { events, isLoading: eventsLoading } = useWorkspaceEvents(selectedWorkspaceId)
  const { artifacts } = useWorkspaceArtifacts(selectedWorkspaceId, { is_output: true })
  const { metrics } = useWorkspaceMetrics(selectedWorkspaceId)

  const selectedDevice = devices.find(d => d.id === selectedDeviceId)
  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId)

  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    setSelectedWorkspaceId(null) // Reset workspace selection
  }

  const handleRefresh = () => {
    refreshDevices()
    refreshWorkspaces()
  }

  // Calculate summary stats
  const onlineDevices = devices.filter(d => d.is_online).length
  const activeWorkspaces = workspaces.filter(w => ['running', 'assigned', 'ready'].includes(w.status)).length
  const totalWorkspaces = workspaces.length

  return (
    <div className="glass rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Executor Monitor</h2>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isFullscreen ? "退出全屏" : "全屏显示"}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{onlineDevices}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Online Devices</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{activeWorkspaces}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Workspaces</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <Folder className="w-8 h-8 text-purple-600" />
            <div>
              <div className="text-2xl font-bold">{totalWorkspaces}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Workspaces</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Devices Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Server className="w-5 h-5" />
            Executor Devices
          </h3>

          {devicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Server className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No devices registered</p>
              <p className="text-sm mt-1">Register a device to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onClick={() => handleDeviceSelect(device.id)}
                  isSelected={selectedDeviceId === device.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Workspaces Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Workspaces
            {selectedDevice && (
              <span className="text-sm font-normal text-gray-600">
                ({selectedDevice.device_name})
              </span>
            )}
          </h3>

          {workspacesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : !selectedDeviceId ? (
            <div className="text-center py-8 text-gray-500">
              <ChevronRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select a device to view workspaces</p>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No workspaces on this device</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {workspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onClick={() => setSelectedWorkspaceId(workspace.id)}
                  isSelected={selectedWorkspaceId === workspace.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Details Column */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Workspace Details
          </h3>

          {!selectedWorkspaceId ? (
            <div className="text-center py-8 text-gray-500">
              <ChevronRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select a workspace to view details</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Workspace Info */}
              {selectedWorkspace && (
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold mb-2">{selectedWorkspace.workspace_name}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Folder className="w-4 h-4" />
                      <span className="truncate">{selectedWorkspace.relative_path}</span>
                    </div>
                    {selectedWorkspace.project_type && (
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4" />
                        <span className="capitalize">{selectedWorkspace.project_type}</span>
                      </div>
                    )}
                    {selectedWorkspace.repo_url && (
                      <div className="flex items-center gap-2">
                        <Network className="w-4 h-4" />
                        <span className="truncate text-blue-600">{selectedWorkspace.repo_url}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Artifacts Summary */}
              {artifacts.length > 0 && (
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileCode className="w-4 h-4" />
                    Artifacts ({artifacts.length})
                  </h4>
                  <div className="space-y-1 text-sm">
                    {artifacts.slice(0, 5).map((artifact) => (
                      <div key={artifact.id} className="flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        <span className="truncate">{artifact.file_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Metrics */}
              {metrics.length > 0 && (
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Latest Metrics
                  </h4>
                  {metrics[0] && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {metrics[0].cpu_usage_percent !== undefined && (
                        <div className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          <span>{metrics[0].cpu_usage_percent.toFixed(1)}% CPU</span>
                        </div>
                      )}
                      {metrics[0].memory_usage_mb !== undefined && (
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          <span>{metrics[0].memory_usage_mb}MB RAM</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Events */}
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent Events
                </h4>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    <EventList events={events} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExecutorMonitor
