export interface EnergySpectrumProps {
  date: string
  now?: Date
  onSaved?: (data: any) => void
}

export interface TimeEntryWithCrossDay {
  id: string
  start_at: string
  end_at?: string
  duration_minutes?: number
  category_color?: string
  category_id?: string
  category_name?: string
  task_title?: string
  note?: string
  isCrossDaySegment?: boolean
}

export interface TimeEntryPosition {
  startSegment: number
  endSegment: number
  startMinutes: number
  endMinutes: number
  originalStartDate: Date
  originalEndDate: Date
  isCrossDaySegment: boolean
}

export interface HoveredTimeEntry {
  entry: TimeEntryWithCrossDay
  position: { x: number; y: number }
}

export interface CrosshairPosition {
  x: number
  time: string
}

export interface InteractiveTooltip {
  time: string
  energy: number
  x: number
  y: number
  visible: boolean
}

export interface CategorySummary {
  id: string
  name: string
  color: string
  minutes: number
}

export interface CurrentTimeInfo {
  isToday: boolean
  isFutureDate?: boolean
  currentHour: number
  currentMinute: number
  currentIndex: number
}

export interface Dimensions {
  w: number
  h: number
}

export interface Padding {
  left: number
  right: number
  top: number
  bottom: number
}
