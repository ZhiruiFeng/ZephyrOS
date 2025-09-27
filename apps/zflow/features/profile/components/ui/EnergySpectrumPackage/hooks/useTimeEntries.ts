import React from 'react'
import { timeTrackingApi } from '@/lib/api'
import { getUserTimezone, processDayEntries, type TimeEntryWithCrossDay } from '@/shared/utils'
import type { CategorySummary } from '../types'

export function useTimeEntries(date: string) {
  const [timeEntries, setTimeEntries] = React.useState<TimeEntryWithCrossDay[]>([])
  const [loadingTimeEntries, setLoadingTimeEntries] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingTimeEntries(true)
      try {
        // Create date range for the selected date, same as DailyTimeModal
        const currentDate = new Date(date + 'T00:00:00')
        const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0, 0)
        const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999)
        
        // Convert to UTC ISO strings for API query (same as DailyTimeModal)
        const dayStart = new Date(startOfDay).toISOString()
        const dayEnd = new Date(endOfDay).toISOString()
        
        console.debug(`Fetching time entries for ${date}:`, {
          localRange: { start: startOfDay.toISOString(), end: endOfDay.toISOString() },
          utcRange: { start: dayStart, end: dayEnd },
          timezone: getUserTimezone()
        })
        
        const data = await timeTrackingApi.listDay({ from: dayStart, to: dayEnd })
        if (!mounted) return
        
        // Map raw entries to include category information
        const rawEntries = (data.entries || []).map((e) => ({
          ...e,
          category_color: (e as any).category?.color || '#CBD5E1',
          category_id: (e as any).category?.id || (e as any).category_id_snapshot || 'uncategorized',
          category_name: (e as any).category?.name || 'Uncategorized',
          task_title: (e as any).task?.title || (e as any).task_title || 'Unknown Task',
        }))
        
        // Process entries using cross-day logic from DailyTimeModal
        const processedEntries = processDayEntries(rawEntries, currentDate)
        
        console.debug(`Processed ${data.entries?.length || 0} entries to ${processedEntries.length} for local date ${date}`, {
          crossDayEntries: processedEntries.filter(e => e.isCrossDaySegment).length
        })
        setTimeEntries(processedEntries)
      } catch (e: any) {
        if (mounted) {
          console.warn('Failed to fetch time entries:', e?.message)
          setTimeEntries([]) // Fail gracefully
        }
      } finally {
        if (mounted) setLoadingTimeEntries(false)
      }
    })()
    return () => { mounted = false }
  }, [date])

  // Group time entries by overlapping periods for stacking
  const timeEntryLayers = React.useMemo(() => {
    if (!timeEntries.length) return []
    
    const layers: Array<Array<TimeEntryWithCrossDay>> = []
    
    timeEntries.forEach(entry => {
      const startDate = new Date(entry.start_at)
      const endDate = entry.end_at ? new Date(entry.end_at) : new Date()
      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes()
      
      // Find a layer where this entry doesn't overlap
      let placedInLayer = false
      for (const layer of layers) {
        const hasOverlap = layer.some(existingEntry => {
          const existingStartDate = new Date(existingEntry.start_at)
          const existingEndDate = existingEntry.end_at ? new Date(existingEntry.end_at) : new Date()
          const existingStartMinutes = existingStartDate.getHours() * 60 + existingStartDate.getMinutes()
          const existingEndMinutes = existingEndDate.getHours() * 60 + existingEndDate.getMinutes()
          return !(endMinutes <= existingStartMinutes || startMinutes >= existingEndMinutes)
        })
        
        if (!hasOverlap) {
          layer.push(entry)
          placedInLayer = true
          break
        }
      }
      
      // If no suitable layer found, create a new one
      if (!placedInLayer) {
        layers.push([entry])
      }
    })
    
    return layers
  }, [timeEntries])

  // Category summary for reference (like DailyTimeModal)
  const categorySummary = React.useMemo(() => {
    const byCat = new Map<string, CategorySummary>()
    
    timeEntries.forEach((entry) => {
      const key = entry.category_id || 'uncategorized'
      const prev = byCat.get(key)
      const add = Math.max(0, entry.duration_minutes || 0)
      
      if (prev) {
        byCat.set(key, { ...prev, minutes: prev.minutes + add })
      } else {
        byCat.set(key, { 
          id: key, 
          name: entry.category_name || 'Uncategorized', 
          color: entry.category_color || '#CBD5E1', 
          minutes: add 
        })
      }
    })
    
    return Array.from(byCat.values()).sort((a, b) => b.minutes - a.minutes)
  }, [timeEntries])

  return {
    timeEntries,
    loadingTimeEntries,
    timeEntryLayers,
    categorySummary
  }
}


