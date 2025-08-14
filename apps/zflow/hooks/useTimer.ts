import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'
import { timeTrackingApi } from '../lib/api'

export interface UseTimerState {
  isRunning: boolean
  runningTaskId?: string
  runningSince?: string
  elapsedMs: number
  start: (taskId: string, opts?: { autoSwitch?: boolean }) => Promise<void>
  stop: (taskId: string, opts?: { overrideEndAt?: string }) => Promise<void>
  refresh: () => void
}

export function useTimer(pollMs: number = 5000): UseTimerState {
  const { data, mutate } = useSWR('running-timer', () => timeTrackingApi.getRunning(), {
    refreshInterval: pollMs,
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
    await timeTrackingApi.stop(taskId, { overrideEndAt: opts?.overrideEndAt })
    await mutate()
  }, [mutate])

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
    runningSince,
    elapsedMs,
    start,
    stop,
    refresh,
  }
}


