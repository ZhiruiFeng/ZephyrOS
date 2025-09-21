// Task type definitions consistent with ZMemory API and web app

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category_id?: string;
  category?: Category;
  created_at: string;
  updated_at: string;
  due_date?: string;
  estimated_duration?: number; // minutes
  progress: number; // 0-100
  assignee?: string;
  completion_date?: string;
  notes?: string;
  tags?: string[];
  // Hierarchy fields
  parent_task_id?: string;
  subtask_order?: number;
  completion_behavior?: 'manual' | 'auto';
  progress_calculation?: 'manual' | 'auto';
  hierarchy_level?: number;
  hierarchy_path?: string;
  subtask_count?: number;
  completed_subtask_count?: number;
}

// TaskMemory type for API compatibility
export interface TaskMemory {
  id: string;
  type: 'task';
  content: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    category?: string;
    category_id?: string;
    due_date?: string;
    estimated_duration?: number;
    progress?: number;
    assignee?: string;
    completion_date?: string;
    notes?: string;
    parent_task_id?: string;
    subtask_order?: number;
    completion_behavior?: 'manual' | 'auto';
    progress_calculation?: 'manual' | 'auto';
  };
  tags: string[];
  created_at: string;
  updated_at: string;
  // Additional fields from API
  category_id?: string;
  hierarchy_level?: number;
  hierarchy_path?: string;
  subtask_count?: number;
  completed_subtask_count?: number;
}

export interface CreateTaskRequest {
  type: 'task';
  content: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    category?: string;
    category_id?: string;
    due_date?: string;
    estimated_duration?: number;
    progress?: number;
    assignee?: string;
    notes?: string;
    parent_task_id?: string;
    subtask_order?: number;
    completion_behavior?: 'manual' | 'auto';
    progress_calculation?: 'manual' | 'auto';
  };
  tags?: string[];
}

export interface TaskQueryParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  assignee?: string;
  tags?: string;
  search?: string;
  due_before?: string;
  due_after?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title';
  sort_order?: 'asc' | 'desc';
  parent_task_id?: string;
  root_tasks_only?: boolean;
  hierarchy_level?: number;
}

// Filter types for UI
export type FilterStatus = 'all' | TaskStatus;
export type FilterPriority = 'all' | TaskPriority;
export type FilterCategory = 'all' | string;

// Statistics
export interface TaskStats {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  by_category: Record<string, number>;
  overdue: number;
  due_today: number;
  due_this_week: number;
  completion_rate: number;
  average_completion_time: number; // days
}