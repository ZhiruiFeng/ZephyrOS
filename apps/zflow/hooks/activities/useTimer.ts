import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'
import { timeTrackingApi, API_BASE } from '../../lib/api'
import eventBus from '../../app/core/events/event-bus'
import { authManager } from '../../lib/auth-manager'

export interface UseTimerState {
  isRunning: boolean
  runningTaskId?: string
  runningTimelineItemId?: string
  runningTimelineItemType?: string
  runningSince?: string
  elapsedMs: number
  start: (taskId: string, opts?: { autoSwitch?: boolean }) => Promise<void>
  stop: (taskId: string, opts?: { overrideEndAt?: string }) => Promise<void>
  startActivity: (activityId: string) => Promise<void>
  stopActivity: (activityId: string) => Promise<void>
  refresh: () => void
}

export function useTimer(pollMs: number = 5000): UseTimerState {
  const { data, mutate } = useSWR('running-timer', async () => {
    const authHeaders = await authManager.getAuthHeaders()
    const res = await fetch(`${API_BASE}/time-entries/running`, {
      headers: authHeaders,
    })
    if (!res.ok) throw new Error('Failed to fetch running timer')
    return res.json()
  }, {
    refreshInterval: pollMs,
    dedupingInterval: 3000, // Dedupe requests within 3 seconds
    revalidateOnFocus: false, // Disable focus revalidation to reduce calls
  })
  const [now, setNow] = useState<number>(() => Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current && clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const start = useCallback(async (taskId: string, opts?: { autoSwitch?: boolean }) => {
    await timeTrackingApi.start(taskId, { autoSwitch: opts?.autoSwitch })
    await mutate()
  }, [mutate])

  const stop = useCallback(async (taskId: string, opts?: { overrideEndAt?: string }) => {
    const result = await timeTrackingApi.stop(taskId, { overrideEndAt: opts?.overrideEndAt })
    try {
      // 通知全局：计时已停止，携带本次 time entry 以便触发能量评估弹窗
      eventBus.emitTimerStopped({ entry: result?.entry || null })
    } catch {}
    await mutate()
    // 保持原签名不返回值，避免破坏现有调用点
  }, [mutate])

  const startActivity = useCallback(async (activityId: string) => {
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/timeline-items/${activityId}/time-entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        start_at: new Date().toISOString(),
        source: 'timer'
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to start activity timer')
    }
    
    await mutate()
  }, [mutate])

  const stopActivity = useCallback(async (activityId: string) => {
    // Get current running timer
    const currentTimer = data?.entry
    if (!currentTimer || (currentTimer as any).timeline_item_id !== activityId) {
      return // No timer running for this activity
    }

    // Update the running time entry to set end_at
    const authHeaders = await authManager.getAuthHeaders()
    const response = await fetch(`${API_BASE}/time-entries/${currentTimer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        end_at: new Date().toISOString()
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to stop activity timer')
    }
    
    await mutate()
  }, [data?.entry, mutate])

  const refresh = useCallback(() => { mutate() }, [mutate])

  const runningSince = data?.entry?.start_at
  const elapsedMs = useMemo(() => {
    if (!runningSince) return 0
    const startMs = new Date(runningSince).getTime()
    return Math.max(0, now - startMs)
  }, [runningSince, now])

  return {
    isRunning: Boolean(data?.entry),
    runningTaskId: data?.entry?.task_id || undefined,
    runningTimelineItemId: (data?.entry as any)?.timeline_item_id || undefined,
    runningTimelineItemType: (data?.entry as any)?.timeline_item_type || undefined,
    runningSince,
    elapsedMs,
    start,
    stop,
    startActivity,
    stopActivity,
    refresh,
  }
}

