import { useMemo } from 'react';
import { TaskMemory } from '../types/task';

export type SortMode = 'none' | 'priority' | 'due_date';

interface UseTaskFilteringProps {
  tasks: TaskMemory[];
  selectedCategory: 'all' | 'uncategorized' | string;
  search: string;
  filterPriority: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  sortMode: SortMode;
  timerRunningTaskId?: string;
}

interface UseTaskFilteringReturn {
  filteredTasks: TaskMemory[];
  currentList: TaskMemory[];
  futureList: TaskMemory[];
  archiveList: TaskMemory[];
  stats: {
    current: number;
    future: number;
    archive: number;
    total: number;
    filtered: number;
  };
}

export function useTaskFiltering({
  tasks,
  selectedCategory,
  search,
  filterPriority,
  sortMode,
  timerRunningTaskId,
}: UseTaskFilteringProps): UseTaskFilteringReturn {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours

  // Common filtering logic with safety checks
  const filteredByCommon = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) {
      return [];
    }

    return tasks.filter((t) => {
      if (!t || !t.content) {
        return false;
      }

      const c = t.content;
      const catId = (t as any).category_id || c.category_id;
      const matchCategory = selectedCategory === 'all' ? true : selectedCategory === 'uncategorized' ? !catId : catId === selectedCategory;
      const matchSearch = !search || (c.title && c.title.toLowerCase().includes(search.toLowerCase())) || ((c.description || '').toLowerCase().includes(search.toLowerCase()));
      const matchPriority = filterPriority === 'all' || c.priority === filterPriority;
      return matchCategory && matchSearch && matchPriority;
    });
  }, [tasks, selectedCategory, search, filterPriority]);

  // Sort function
  const sortTasks = (taskList: TaskMemory[], mode: SortMode) => {
    if (mode === 'none') return taskList;

    return [...taskList].sort((a, b) => {
      switch (mode) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.content.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.content.priority as keyof typeof priorityOrder] || 0;
          return bPriority - aPriority;
        case 'due_date':
          const aDate = a.content.due_date ? new Date(a.content.due_date).getTime() : Infinity;
          const bDate = b.content.due_date ? new Date(b.content.due_date).getTime() : Infinity;
          return aDate - bDate;
        default:
          return 0;
      }
    });
  };

  // Current: pending/in_progress/completed within 24h
  const currentList = useMemo(() => {
    if (!filteredByCommon || !Array.isArray(filteredByCommon)) {
      return [];
    }

    const list = filteredByCommon.filter((t) => {
      if (!t || !t.content) return false;
      const c = t.content;
      if (c.status === 'pending' || c.status === 'in_progress') return true;
      if (c.status === 'completed') {
        const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : new Date(t.updated_at).getTime();
        return completedAt && now - completedAt <= windowMs;
      }
      return false;
    });
    
    // Sort with timing tasks first, then in_progress, then pending, then completed last
    const sorted = sortTasks(list, sortMode);
    return sorted.sort((a, b) => {
      const aStatus = a.content.status;
      const bStatus = b.content.status;
      const aIsTiming = timerRunningTaskId === a.id;
      const bIsTiming = timerRunningTaskId === b.id;
      
      // Timing tasks always come first
      if (aIsTiming && !bIsTiming) return -1;
      if (bIsTiming && !aIsTiming) return 1;
      
      // Then in_progress tasks come second
      if (aStatus === 'in_progress' && bStatus !== 'in_progress') return -1;
      if (bStatus === 'in_progress' && aStatus !== 'in_progress') return 1;
      
      // Then pending tasks come third
      if (aStatus === 'pending' && bStatus === 'completed') return -1;
      if (bStatus === 'pending' && aStatus === 'completed') return 1;
      
      // Completed tasks come last
      if (aStatus === 'completed' && bStatus !== 'completed') return 1;
      if (bStatus === 'completed' && aStatus !== 'completed') return -1;
      
      // Keep original order for same status
      return 0;
    });
  }, [filteredByCommon, sortMode, timerRunningTaskId, now, windowMs]);

  // Future: on_hold
  const futureList = useMemo(() => {
    if (!filteredByCommon || !Array.isArray(filteredByCommon)) {
      return [];
    }

    const list = filteredByCommon.filter(t => t && t.content && t.content.status === 'on_hold');
    return sortTasks(list, sortMode);
  }, [filteredByCommon, sortMode]);

  // Archive: completed beyond 24h + cancelled
  const archiveList = useMemo(() => {
    if (!filteredByCommon || !Array.isArray(filteredByCommon)) {
      return [];
    }

    const list = filteredByCommon.filter((t) => {
      if (!t || !t.content) return false;
      const c = t.content;
      if (c.status === 'cancelled') return true;
      if (c.status === 'completed') {
        const completedAt = c.completion_date ? new Date(c.completion_date).getTime() : new Date(t.updated_at).getTime();
        return completedAt && now - completedAt > windowMs;
      }
      return false;
    });
    return sortTasks(list, sortMode);
  }, [filteredByCommon, now, windowMs, sortMode]);

  // Backward compatibility
  const filteredTasks = currentList;

  const stats = useMemo(() => {
    return {
      current: currentList?.length || 0,
      future: futureList?.length || 0,
      archive: archiveList?.length || 0,
      total: tasks?.length || 0,
      filtered: filteredByCommon?.length || 0,
    };
  }, [currentList?.length, futureList?.length, archiveList?.length, tasks?.length, filteredByCommon?.length]);

  const result = {
    filteredTasks: filteredTasks || [],
    currentList: currentList || [],
    futureList: futureList || [],
    archiveList: archiveList || [],
    stats: stats || { current: 0, future: 0, archive: 0, total: 0, filtered: 0 },
  };


  return result;
}



