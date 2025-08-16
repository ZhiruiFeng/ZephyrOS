import { TimeEntry } from '../../lib/api'

// 扩展TimeEntry类型以支持跨天标识和额外字段
export type TimeEntryWithCrossDay = TimeEntry & { 
  isCrossDaySegment?: boolean
  originalId?: string // 保存原始任务ID
  // 来自查询的额外字段
  category_id?: string
  category_name?: string
  category_color?: string
}

// 格式化日期为YYYY-MM-DD字符串
export function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 计算时间条目在特定日期的分钟数（处理跨天情况）
export function calculateMinutesInDay(entry: TimeEntry, dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map((v) => parseInt(v, 10))
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0)
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999)
  
  const start = new Date(entry.start_at)
  const end = entry.end_at ? new Date(entry.end_at) : new Date()
  
  // 截断到当天范围内
  const clampedStart = start < dayStart ? dayStart : start
  const clampedEnd = end > dayEnd ? dayEnd : end
  
  // 如果任务不在这一天，返回0
  if (clampedStart >= dayEnd || clampedEnd <= dayStart) {
    return 0
  }
  
  return Math.max(0, Math.round((clampedEnd.getTime() - clampedStart.getTime()) / 60000))
}

// 将跨天任务分解到每天
export function splitCrossDayEntries(entries: TimeEntry[]): Map<string, TimeEntryWithCrossDay[]> {
  const map = new Map<string, TimeEntryWithCrossDay[]>()
  
  for (const entry of entries) {
    const start = new Date(entry.start_at)
    const end = entry.end_at ? new Date(entry.end_at) : new Date()
    
    // 计算任务跨越的天数
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    
    // 遍历每一天
    for (let currentDay = new Date(startDay); currentDay <= endDay; currentDay.setDate(currentDay.getDate() + 1)) {
      const dayKey = formatDateKey(currentDay)
      const dayStart = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 0, 0, 0, 0)
      const dayEnd = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 23, 59, 59, 999)
      
      // 检查任务是否与当天有重叠
      if (start <= dayEnd && end >= dayStart) {
        // 创建当天的任务片段
        const dayEntry: TimeEntryWithCrossDay = {
          ...entry,
          // 为跨天任务生成唯一ID
          id: entry.id + (currentDay.getTime() === startDay.getTime() ? '' : `-day-${dayKey}`),
          originalId: entry.id,
          // 标记是否为跨天任务片段
          isCrossDaySegment: currentDay.getTime() !== startDay.getTime() || currentDay.getTime() !== endDay.getTime(),
          start_at: (start > dayStart ? start : dayStart).toISOString(),
          end_at: (end < dayEnd ? end : dayEnd).toISOString(),
          duration_minutes: calculateMinutesInDay(entry, dayKey)
        }
        
        const arr = map.get(dayKey) || []
        arr.push(dayEntry)
        map.set(dayKey, arr)
      }
    }
  }
  
  // 对每天的任务按开始时间排序
  map.forEach((arr, k) => {
    arr.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    map.set(k, arr)
  })
  
  return map
}

// 为特定日期过滤和处理时间条目
export function processDayEntries(entries: TimeEntry[], targetDate: Date): TimeEntryWithCrossDay[] {
  const dayKey = formatDateKey(targetDate)
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0)
  const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999)
  
  const processedEntries: TimeEntryWithCrossDay[] = []
  
  for (const entry of entries) {
    const start = new Date(entry.start_at)
    const end = entry.end_at ? new Date(entry.end_at) : new Date()
    
    // 检查任务是否与目标日期有重叠
    if (start <= dayEnd && end >= dayStart) {
      // 判断是否跨天
      const entryStartDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const entryEndDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      const isCrossDay = entryStartDay.getTime() !== entryEndDay.getTime()
      
      const processedEntry: TimeEntryWithCrossDay = {
        ...entry,
        originalId: entry.id,
        isCrossDaySegment: isCrossDay,
        start_at: (start > dayStart ? start : dayStart).toISOString(),
        end_at: (end < dayEnd ? end : dayEnd).toISOString(),
        duration_minutes: calculateMinutesInDay(entry, dayKey)
      }
      
      processedEntries.push(processedEntry)
    }
  }
  
  // 按开始时间排序
  return processedEntries.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
}

// 计算给定条目数组的总分钟数
export function calculateTotalMinutes(entries: TimeEntryWithCrossDay[]): number {
  return entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0)
}

// 获取跨天任务的边框样式类名
export function getCrossDayBorderClass(isCrossDaySegment: boolean): string {
  return isCrossDaySegment ? 'border-dashed' : ''
}
