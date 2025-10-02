import useSWR from 'swr'
import { useState, useCallback } from 'react'
import {
  executorApi,
  type ExecutorDevice,
  type ExecutorWorkspace,
  type ExecutorWorkspaceTask,
  type ExecutorWorkspaceEvent,
  type ExecutorWorkspaceArtifact,
  type ExecutorWorkspaceMetric
} from '@/lib/api/executor-api'

// =====================================================
// DEVICES
// =====================================================

export function useExecutorDevices() {
  const { data, error, isLoading, mutate } = useSWR<ExecutorDevice[]>(
    '/api/executor/devices',
    () => executorApi.fetchDevices(),
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  )

  return {
    devices: data || [],
    isLoading,
    error,
    refresh: mutate
  }
}

export function useExecutorDevice(deviceId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ExecutorDevice>(
    deviceId ? `/api/executor/devices/${deviceId}` : null,
    deviceId ? () => executorApi.fetchDevice(deviceId) : null,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  return {
    device: data,
    isLoading,
    error,
    refresh: mutate
  }
}

// =====================================================
// WORKSPACES
// =====================================================

export function useExecutorWorkspaces(filters?: {
  executor_device_id?: string
  agent_id?: string
  status?: string
}) {
  const filterKey = filters ? JSON.stringify(filters) : 'all'

  const { data, error, isLoading, mutate } = useSWR<ExecutorWorkspace[]>(
    `/api/executor/workspaces?${filterKey}`,
    () => executorApi.fetchWorkspaces(filters),
    {
      refreshInterval: 10000, // Refresh every 10 seconds for workspaces
      revalidateOnFocus: true
    }
  )

  return {
    workspaces: data || [],
    isLoading,
    error,
    refresh: mutate
  }
}

export function useExecutorWorkspace(workspaceId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ExecutorWorkspace>(
    workspaceId ? `/api/executor/workspaces/${workspaceId}` : null,
    workspaceId ? () => executorApi.fetchWorkspace(workspaceId) : null,
    {
      refreshInterval: 10000,
      revalidateOnFocus: true
    }
  )

  return {
    workspace: data,
    isLoading,
    error,
    refresh: mutate
  }
}

// =====================================================
// TASKS
// =====================================================

export function useWorkspaceTasks(workspaceId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ExecutorWorkspaceTask[]>(
    workspaceId ? `/api/executor/workspaces/${workspaceId}/tasks` : null,
    workspaceId ? () => executorApi.fetchWorkspaceTasks(workspaceId) : null,
    {
      refreshInterval: 5000, // Refresh every 5 seconds for active tasks
      revalidateOnFocus: true
    }
  )

  return {
    tasks: data || [],
    isLoading,
    error,
    refresh: mutate
  }
}

export function useWorkspaceTask(taskId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ExecutorWorkspaceTask>(
    taskId ? `/api/executor/tasks/${taskId}` : null,
    taskId ? () => executorApi.fetchWorkspaceTask(taskId) : null,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true
    }
  )

  return {
    task: data,
    isLoading,
    error,
    refresh: mutate
  }
}

// =====================================================
// EVENTS
// =====================================================

export function useWorkspaceEvents(
  workspaceId: string | null,
  filters?: { level?: string; event_category?: string; limit?: number }
) {
  const filterKey = filters ? JSON.stringify(filters) : 'all'

  const { data, error, isLoading, mutate } = useSWR<ExecutorWorkspaceEvent[]>(
    workspaceId ? `/api/executor/workspaces/${workspaceId}/events?${filterKey}` : null,
    workspaceId ? () => executorApi.fetchWorkspaceEvents(workspaceId, filters) : null,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true
    }
  )

  return {
    events: data || [],
    isLoading,
    error,
    refresh: mutate
  }
}

// =====================================================
// ARTIFACTS
// =====================================================

export function useWorkspaceArtifacts(
  workspaceId: string | null,
  filters?: { artifact_type?: string; is_output?: boolean }
) {
  const filterKey = filters ? JSON.stringify(filters) : 'all'

  const { data, error, isLoading, mutate } = useSWR<ExecutorWorkspaceArtifact[]>(
    workspaceId ? `/api/executor/workspaces/${workspaceId}/artifacts?${filterKey}` : null,
    workspaceId ? () => executorApi.fetchWorkspaceArtifacts(workspaceId, filters) : null,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true
    }
  )

  return {
    artifacts: data || [],
    isLoading,
    error,
    refresh: mutate
  }
}

// =====================================================
// METRICS
// =====================================================

export function useWorkspaceMetrics(
  workspaceId: string | null,
  filters?: { metric_type?: string }
) {
  const filterKey = filters ? JSON.stringify(filters) : 'all'

  const { data, error, isLoading, mutate } = useSWR<ExecutorWorkspaceMetric[]>(
    workspaceId ? `/api/executor/workspaces/${workspaceId}/metrics?${filterKey}` : null,
    workspaceId ? () => executorApi.fetchWorkspaceMetrics(workspaceId, filters) : null,
    {
      refreshInterval: 10000,
      revalidateOnFocus: true
    }
  )

  return {
    metrics: data || [],
    isLoading,
    error,
    refresh: mutate
  }
}

// =====================================================
// COMPOSITE HOOK - ALL EXECUTOR DATA
// =====================================================

export function useExecutorDashboard() {
  const { devices, isLoading: devicesLoading, error: devicesError } = useExecutorDevices()
  const { workspaces, isLoading: workspacesLoading, error: workspacesError } = useExecutorWorkspaces()

  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null)

  const selectDevice = useCallback((deviceId: string | null) => {
    setSelectedDevice(deviceId)
    setSelectedWorkspace(null) // Reset workspace selection when device changes
  }, [])

  const selectWorkspace = useCallback((workspaceId: string | null) => {
    setSelectedWorkspace(workspaceId)
  }, [])

  return {
    // Data
    devices,
    workspaces,

    // Selection
    selectedDevice,
    selectedWorkspace,
    selectDevice,
    selectWorkspace,

    // Loading states
    isLoading: devicesLoading || workspacesLoading,

    // Errors
    error: devicesError || workspacesError
  }
}
