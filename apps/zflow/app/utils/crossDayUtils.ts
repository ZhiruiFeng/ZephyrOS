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

// 将UTC时间转换为本地时间，但保持日期边界在本地时区
// 注意：month 参数应该是 0-based (即 0-11)，与 JavaScript Date 构造函数一致
function createLocalDateBoundary(year: number, month: number, day: number, hour: number = 0, minute: number = 0, second: number = 0, ms: number = 0): Date {
  // 在本地时区创建日期边界
  return new Date(year, month, day, hour, minute, second, ms)
}

// 计算时间条目在特定本地日期的分钟数（处理跨天情况和时区）
export function calculateMinutesInDay(entry: TimeEntry, dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map((v) => parseInt(v, 10))
  // 在本地时区创建日期边界 (m-1 因为 dayKey 中的月份是 1-based，但 Date 构造函数需要 0-based)
  const dayStart = createLocalDateBoundary(y, m - 1, d, 0, 0, 0, 0)
  const dayEnd = createLocalDateBoundary(y, m - 1, d, 23, 59, 59, 999)
  
  // UTC 时间戳转换为本地时间 Date 对象（JavaScript 会自动处理时区转换）
  const start = new Date(entry.start_at) // 这里已经是本地时间表示
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

// 将跨天任务分解到每天（时区感知）
export function splitCrossDayEntries(entries: TimeEntry[]): Map<string, TimeEntryWithCrossDay[]> {
  const map = new Map<string, TimeEntryWithCrossDay[]>()
  
  for (const entry of entries) {
    // UTC时间戳自动转换为本地时间 Date 对象
    const start = new Date(entry.start_at)
    const end = entry.end_at ? new Date(entry.end_at) : new Date()
    
    // 使用本地时间计算日期边界
    const startDay = createLocalDateBoundary(start.getFullYear(), start.getMonth(), start.getDate())
    const endDay = createLocalDateBoundary(end.getFullYear(), end.getMonth(), end.getDate())
    
    // 遍历每一天
    for (let currentDay = new Date(startDay); currentDay <= endDay; currentDay.setDate(currentDay.getDate() + 1)) {
      const dayKey = formatDateKey(currentDay)
      const dayStart = createLocalDateBoundary(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 0, 0, 0, 0)
      const dayEnd = createLocalDateBoundary(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 23, 59, 59, 999)
      
      // 检查任务是否与当天有重叠
      if (start <= dayEnd && end >= dayStart) {
        // 创建当天的任务片段
        const clampedStart = start > dayStart ? start : dayStart
        const clampedEnd = end < dayEnd ? end : dayEnd
        
        const dayEntry: TimeEntryWithCrossDay = {
          ...entry,
          // 为跨天任务生成唯一ID
          id: entry.id + (currentDay.getTime() === startDay.getTime() ? '' : `-day-${dayKey}`),
          originalId: entry.id,
          // 标记是否为跨天任务片段
          isCrossDaySegment: currentDay.getTime() !== startDay.getTime() || currentDay.getTime() !== endDay.getTime(),
          start_at: clampedStart.toISOString(),
          end_at: clampedEnd.toISOString(),
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

// 为特定日期过滤和处理时间条目（时区感知）
export function processDayEntries(entries: TimeEntry[], targetDate: Date): TimeEntryWithCrossDay[] {
  const dayKey = formatDateKey(targetDate)
  // 使用本地时区创建目标日期的边界 (getMonth() 已经是 0-based)
  const dayStart = createLocalDateBoundary(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0)
  const dayEnd = createLocalDateBoundary(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999)
  
  const processedEntries: TimeEntryWithCrossDay[] = []
  
  for (const entry of entries) {
    // UTC时间戳自动转换为本地时间 Date 对象
    const start = new Date(entry.start_at)
    const end = entry.end_at ? new Date(entry.end_at) : new Date()
    
    // 检查任务是否与目标日期有重叠
    if (start <= dayEnd && end >= dayStart) {
      // 判断是否跨天（基于本地时间的日期）
      const entryStartDay = createLocalDateBoundary(start.getFullYear(), start.getMonth(), start.getDate())
      const entryEndDay = createLocalDateBoundary(end.getFullYear(), end.getMonth(), end.getDate())
      const isCrossDay = entryStartDay.getTime() !== entryEndDay.getTime()
      
      // 裁剪到当天边界
      const clampedStart = start > dayStart ? start : dayStart
      const clampedEnd = end < dayEnd ? end : dayEnd
      
      const processedEntry: TimeEntryWithCrossDay = {
        ...entry,
        originalId: entry.id,
        isCrossDaySegment: isCrossDay,
        start_at: clampedStart.toISOString(),
        end_at: clampedEnd.toISOString(),
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
