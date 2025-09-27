import React from 'react'
import { energyDaysApi } from '@/lib/api'
import { defaultCurve, defaultMask, clamp } from '../utils'
import { SEGMENTS } from '../utils'

export function useEnergyData(date: string) {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [curve, setCurve] = React.useState<number[]>(defaultCurve)
  const [mask, setMask] = React.useState<boolean[]>(defaultMask)
  const [lastCheckedIndex, setLastCheckedIndex] = React.useState<number | null>(null)
  const [lastSaved, setLastSaved] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await energyDaysApi.get(date)
        if (!mounted) return
        if (data) {
          const normalizedCurve = (data.curve && data.curve.length === SEGMENTS)
            ? data.curve.map((x: any) => {
                const n = Number(x)
                return Number.isFinite(n) ? clamp(n) : 5
              })
            : defaultCurve()
          setCurve(normalizedCurve)
          setMask((data.edited_mask && data.edited_mask.length === SEGMENTS) ? data.edited_mask : defaultMask())
          setLastCheckedIndex(data.last_checked_index ?? null)
          setLastSaved(data.updated_at ?? null)
        } else {
          // create default using historical average curve (fallback to 5)
          const end = new Date(date)
          const start = new Date(end)
          start.setDate(start.getDate() - 30)
          let avgCurve = defaultCurve()
          try {
            const history = await energyDaysApi.list({ start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10), limit: 60 })
            if (history && history.length > 0) {
              const sums = new Array(SEGMENTS).fill(0)
              const counts = new Array(SEGMENTS).fill(0)
              for (const d of history) {
                if (Array.isArray(d.curve) && d.curve.length === SEGMENTS) {
                  for (let i = 0; i < SEGMENTS; i++) {
                    const val = d.curve[i]
                    if (typeof val === 'number' && !Number.isNaN(val)) {
                      sums[i] += val
                      counts[i] += 1
                    }
                  }
                }
              }
              avgCurve = sums.map((s, i) => counts[i] > 0 ? Math.round(s / counts[i]) : 5)
            }
          } catch {}
          const created = await energyDaysApi.upsert({ local_date: date, curve: avgCurve, source: 'simulated' })
          if (!mounted) return
          setCurve(created.curve)
          setMask(created.edited_mask || defaultMask())
          setLastCheckedIndex(created.last_checked_index ?? null)
          setLastSaved(created.updated_at ?? null)
        }
      } catch (e: any) {
        setError(e?.message || 'Error loading energy data')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [date])

  const saveAll = async (onSaved?: (data: any) => void) => {
    try {
      setSaving(true)
      const updated = await energyDaysApi.update(date, { curve, edited_mask: mask, source: 'user_edited' })
      setLastSaved(updated.updated_at ?? new Date().toISOString())
      onSaved?.(updated)
    } catch (e: any) {
      setError(e?.message || 'Error saving energy data')
    } finally {
      setSaving(false)
    }
  }

  const updateCurve = (idx: number, value: number) => {
    setCurve(prev => {
      const next = prev.slice()
      next[idx] = clamp(value)
      return next
    })
    setMask(prev => {
      const next = prev.slice()
      next[idx] = true
      return next
    })
  }

  return {
    loading,
    saving,
    error,
    curve,
    mask,
    lastCheckedIndex,
    lastSaved,
    setCurve,
    setMask,
    saveAll,
    updateCurve
  }
}
