import { useState, useEffect, useCallback } from 'react';
import { timeTrackingApi, memoriesApi, zmemoryApi } from '../lib/api';

export interface TimelineItem {
  id: string;
  type: 'time_entry' | 'memory' | 'task' | 'activity';
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string;
  duration?: number; // minutes
  category?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
  tags: string[];
  location?: string | null;
  isHighlight?: boolean;
  status?: string;
  priority?: string;
  metadata?: Record<string, any>;
}

export interface TimelineData {
  items: TimelineItem[];
  totalDuration: number;
  categories: Array<{ id: string; name: string; color: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
}

export function useTimeline(selectedDate: Date) {
  const [data, setData] = useState<TimelineData>({
    items: [],
    totalDuration: 0,
    categories: [],
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimelineData = useCallback(async (): Promise<TimelineData> => {
    try {
      // Normalize the selected date to start of day
      const normalizedDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0, 0, 0, 0
      );
      
      // Query for EXACT local day converted to UTC
      const startOfLocalDay = new Date(
        normalizedDate.getFullYear(),
        normalizedDate.getMonth(),
        normalizedDate.getDate(),
        0, 0, 0, 0
      );
      const endOfLocalDay = new Date(
        normalizedDate.getFullYear(),
        normalizedDate.getMonth(),
        normalizedDate.getDate(),
        23, 59, 59, 999
      );
      
      const from = startOfLocalDay.toISOString();
      const to = endOfLocalDay.toISOString();

      // Fetch all data in parallel
      const [memoriesResult, tasksResult] = await Promise.all([
        memoriesApi.search({
          date_from: from,
          date_to: to,
          limit: 100
        }),
        // Fetch all unfinished tasks (not filtered by date)
        zmemoryApi.getTasks({
          limit: 500,
          root_tasks_only: true
        })
      ]);

      // TODO: Implement time entries API or use alternative data source
      const timeEntriesResult: any[] = [];

      // Transform processed time entries
      const timeEntryItems: TimelineItem[] = (timeEntriesResult || []).map(entry => ({
        id: entry.id,
        type: 'time_entry' as const,
        title: entry.task_id ? 'Time Entry' : 'Activity Entry',
        description: entry.notes,
        startTime: entry.start_at,
        endTime: entry.end_at || undefined,
        duration: entry.duration_seconds ? Math.round(entry.duration_seconds / 60) : undefined,
        category: undefined, // TODO: Add category support for time entries
        tags: [],
        location: undefined,
        isHighlight: false,
        metadata: {
          source: entry.source,
          taskId: entry.task_id,
          timelineItemId: entry.timeline_item_id,
          timelineItemType: entry.timeline_item_type
        }
      }));

      // Filter and transform memories to only include those within the normalized selected day
      const dayStart = new Date(
        normalizedDate.getFullYear(),
        normalizedDate.getMonth(),
        normalizedDate.getDate(),
        0, 0, 0, 0
      );
      const dayEnd = new Date(
        normalizedDate.getFullYear(),
        normalizedDate.getMonth(),
        normalizedDate.getDate(),
        23, 59, 59, 999
      );
      
      const memoryItems: TimelineItem[] = (memoriesResult.memories || [])
        .filter(memory => {
          const capturedAt = new Date(memory.captured_at);
          return capturedAt >= dayStart && capturedAt <= dayEnd;
        })
        .map(memory => ({
          id: memory.id,
          type: 'memory' as const,
          title: memory.title,
          description: memory.note,
          startTime: memory.captured_at,
          endTime: undefined,
          duration: undefined,
          category: undefined, // TODO: Add category support for memories
          tags: memory.tags,
          location: undefined,
          isHighlight: memory.is_highlight,
          metadata: {
            memoryType: memory.memory_type,
            emotionValence: memory.emotion_valence,
            emotionArousal: memory.emotion_arousal,
            mood: memory.mood,
            importance: memory.importance_level,
            salience: memory.salience_score,
            capturedAt: memory.captured_at
          }
        }));

      // Transform tasks - include all unfinished tasks and add age-based styling
      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const taskItems: TimelineItem[] = (tasksResult || [])
        .filter((task: any) => {
          const status = task.content.status;
          // Include only unfinished tasks
          return status === 'pending' || status === 'in_progress' || status === 'on_hold';
        })
        .map((task: any) => {
          const createdAt = new Date(task.created_at);
          const isOldTask = createdAt < oneMonthAgo;

          return {
            id: task.id,
            type: 'task' as const,
            title: task.content.title,
            description: task.content.description,
            startTime: task.created_at,
            endTime: task.content.completion_date,
            duration: task.content.estimated_duration,
            category: task.category ? {
              id: task.category.id,
              name: task.category.name,
              color: task.category.color,
              icon: task.category.icon
            } : undefined,
            tags: task.tags || [],
            location: undefined,
            isHighlight: false,
            status: task.content.status,
            priority: task.content.priority,
            metadata: {
              progress: task.content.progress,
              assignee: task.content.assignee,
              dueDate: task.content.due_date,
              isOldTask: isOldTask,
              createdAt: task.created_at
            }
          };
        });

      // Combine all items and sort by start time
      const allItems = [...timeEntryItems, ...memoryItems, ...taskItems].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Calculate total duration
      const totalDuration = allItems.reduce((total, item) => {
        if (item.duration) {
          return total + item.duration;
        }
        return total;
      }, 0);

      // Aggregate categories
      const categoryMap = new Map<string, { id: string; name: string; color: string; count: number }>();
      allItems.forEach(item => {
        if (item.category) {
          const existing = categoryMap.get(item.category.id);
          if (existing) {
            existing.count++;
          } else {
            categoryMap.set(item.category.id, {
              id: item.category.id,
              name: item.category.name,
              color: item.category.color,
              count: 1
            });
          }
        }
      });

      // Aggregate tags
      const tagMap = new Map<string, number>();
      allItems.forEach(item => {
        item.tags.forEach(tag => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      });

      return {
        items: allItems,
        totalDuration,
        categories: Array.from(categoryMap.values()).sort((a, b) => b.count - a.count),
        tags: Array.from(tagMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20) // Top 20 tags
      };
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
      throw error;
    }
  }, [selectedDate]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchTimelineData();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch timeline data';
      setError(errorMessage);
      console.error('Failed to refetch timeline data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchTimelineData]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    timelineData: data,
    isLoading: loading,
    error,
    refetch,
  };
}

// Hook for getting timeline data for a specific date range
export function useTimelineRange(startDate: Date, endDate: Date) {
  const [data, setData] = useState<TimelineData>({
    items: [],
    totalDuration: 0,
    categories: [],
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimelineRangeData = useCallback(async (): Promise<TimelineData> => {
    try {
      // Normalize dates to start of day
      const normalizedStartDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        0, 0, 0, 0
      );
      const normalizedEndDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23, 59, 59, 999
      );
      
      // Query for EXACT local date range converted to UTC
      const start = normalizedStartDate.toISOString();
      const end = normalizedEndDate.toISOString();

      // Fetch data for the extended date range
      const [memoriesResult] = await Promise.all([
        memoriesApi.search({ 
          date_from: start, 
          date_to: end,
          limit: 500 
        })
      ]);

      // TODO: Implement time entries API or use alternative data source
      const timeEntriesResult: any[] = [];

      // Transform entries directly
      const timeEntryItems: TimelineItem[] = (timeEntriesResult || []).map(entry => ({
        id: entry.id,
        type: 'time_entry' as const,
        title: entry.task_id ? 'Time Entry' : 'Activity Entry',
        description: entry.notes,
        startTime: entry.start_at,
        endTime: entry.end_at || undefined,
        duration: entry.duration_seconds ? Math.round(entry.duration_seconds / 60) : undefined,
        category: undefined,
        tags: [],
        location: undefined,
        isHighlight: false,
        metadata: {
          source: entry.source,
          taskId: entry.task_id,
          timelineItemId: entry.timeline_item_id,
          timelineItemType: entry.timeline_item_type
        }
      }));

      // Filter and clip memories to the requested range
      const memoryItems: TimelineItem[] = (memoriesResult.memories || [])
        .filter(memory => {
          const capturedAt = new Date(memory.captured_at);
          return capturedAt >= normalizedStartDate && capturedAt <= normalizedEndDate;
        })
        .map(memory => ({
          id: memory.id,
          type: 'memory' as const,
          title: memory.title,
          description: memory.note,
          startTime: memory.captured_at,
          endTime: undefined,
          duration: undefined,
          category: undefined,
          tags: memory.tags,
          location: undefined,
          isHighlight: memory.is_highlight,
          metadata: {
            memoryType: memory.memory_type,
            emotionValence: memory.emotion_valence,
            emotionArousal: memory.emotion_arousal,
            mood: memory.mood,
            importance: memory.importance_level,
            salience: memory.salience_score,
            capturedAt: memory.captured_at
          }
        }));

      const allItems = [...timeEntryItems, ...memoryItems].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      const totalDuration = allItems.reduce((total, item) => {
        if (item.duration) {
          return total + item.duration;
        }
        return total;
      }, 0);

      // Aggregate categories and tags
      const categoryMap = new Map<string, { id: string; name: string; color: string; count: number }>();
      const tagMap = new Map<string, number>();

      allItems.forEach(item => {
        if (item.category) {
          const existing = categoryMap.get(item.category.id);
          if (existing) {
            existing.count++;
          } else {
            categoryMap.set(item.category.id, {
              id: item.category.id,
              name: item.category.name,
              color: item.category.color,
              count: 1
            });
          }
        }
        
        item.tags.forEach(tag => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      });

      return {
        items: allItems,
        totalDuration,
        categories: Array.from(categoryMap.values()).sort((a, b) => b.count - a.count),
        tags: Array.from(tagMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20)
      };
    } catch (error) {
      console.error('Failed to fetch timeline range data:', error);
      throw error;
    }
  }, [startDate, endDate]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchTimelineRangeData();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch timeline range data';
      setError(errorMessage);
      console.error('Failed to refetch timeline range data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchTimelineRangeData]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    timelineData: data,
    isLoading: loading,
    error,
    refetch,
  };
}
