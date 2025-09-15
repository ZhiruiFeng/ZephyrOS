export type ID = string
export type ItemType = 'task' | 'activity' | 'memory' | 'time_entry'

export interface Category { id: ID; name: string; color: string; icon?: string }

export interface TimelineEvent {
  id: ID
  title: string
  start: string // ISO
  end: string   // ISO
  type: ItemType
  categoryId?: ID
  source?: string
  energy?: { avg?: number; min?: number; max?: number; samples?: Array<[number, number]> }
  meta?: {
    note?: string
    tags?: string[]
    isCrossDaySegment?: boolean
    originalId?: string
    originalStart?: string
    originalEnd?: string
    originalType?: string
    relatedItemId?: string
    timelineItemType?: string
    timelineItemTitle?: string
    timelineItemId?: string
    capturedAt?: string
    isOldTask?: boolean
    createdAt?: string
    isCreationEvent?: boolean
  }
}
