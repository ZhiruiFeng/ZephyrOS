import { useMemo } from 'react';
import { TaskMemory } from '../types/task';

export type SortMode = 'none' | 'priority' | 'due_date';

interface UseTaskFilteringProps {
  tasks: TaskMemory[];
  selectedCategory: 'all' | 'uncategorized' | string;
  search: string;
  filterPriority: 'all' | 'low' | 'medium' | 'high' | 'urgent';
  sortMode: SortMode;
}

interface UseTaskFilteringReturn {
  filteredTasks: TaskMemory[];
  stats: {
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
}: UseTaskFilteringProps): UseTaskFilteringReturn {
  
  // Filter tasks based on criteria
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      const content = task.content;
      const catId = (task as any).category_id || content.category_id;
      
      // Category filter
      const matchCategory = 
        selectedCategory === 'all' 
          ? true 
          : selectedCategory === 'uncategorized' 
            ? !catId 
            : catId === selectedCategory;
      
      // Search filter
      const matchSearch = !search || 
        content.title.toLowerCase().includes(search.toLowerCase()) || 
        (content.description || '').toLowerCase().includes(search.toLowerCase());
      
      // Priority filter
      const matchPriority = filterPriority === 'all' || content.priority === filterPriority;
      
      return matchCategory && matchSearch && matchPriority;
    });

    // Sort tasks
    if (sortMode !== 'none') {
      filtered = filtered.sort((a, b) => {
        switch (sortMode) {
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            const aPriority = priorityOrder[a.content.priority as keyof typeof priorityOrder] || 0;
            const bPriority = priorityOrder[b.content.priority as keyof typeof priorityOrder] || 0;
            return bPriority - aPriority; // Higher priority first
            
          case 'due_date':
            const aDate = a.content.due_date ? new Date(a.content.due_date).getTime() : Infinity;
            const bDate = b.content.due_date ? new Date(b.content.due_date).getTime() : Infinity;
            return aDate - bDate; // Earlier dates first
            
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [tasks, selectedCategory, search, filterPriority, sortMode]);

  const stats = useMemo(() => ({
    total: tasks.length,
    filtered: filteredTasks.length,
  }), [tasks.length, filteredTasks.length]);

  return {
    filteredTasks,
    stats,
  };
}



