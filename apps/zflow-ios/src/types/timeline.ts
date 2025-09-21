export interface TimelineEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'task' | 'activity' | 'memory';
  categoryId?: string;
  source?: string;
  energy?: {
    avg: number;
    min: number;
    max: number;
    samples: number;
  };
  meta?: {
    note?: string;
    tags?: string[];
    isCrossDaySegment?: boolean;
    originalId?: string;
    originalStart?: string;
    originalEnd?: string;
    capturedAt?: string;
    originalType?: string;
    relatedItemId?: string;
    timelineItemType?: string;
    timelineItemTitle?: string;
    timelineItemId?: string;
    isOldTask?: boolean;
    createdAt?: string;
    isCreationEvent?: boolean;
  };
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface TimelineStats {
  totalDuration: number;
  totalItems: number;
  categories: number;
  tags: number;
}

export interface TimelineDetailedStats {
  itemTypeBreakdown: {
    timeEntries: { count: number; duration: number };
    memories: { count: number };
    tasks: { count: number };
    activities: { count: number };
  };
  topCategories: Array<{ id: string; name: string; color: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
}
