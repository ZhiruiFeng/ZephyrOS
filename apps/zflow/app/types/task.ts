// Category type definition
export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

// Task relation type
export type TaskRelationType = 'subtask' | 'related' | 'dependency' | 'blocked_by';

export interface TaskRelation {
  id: string;
  parent_task_id: string;
  child_task_id: string;
  relation_type: TaskRelationType;
  created_at: string;
}

// Task type definition
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
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
  // Relation data
  subtasks?: Task[];
  related_tasks?: Task[];
  dependencies?: Task[];
  blocked_by?: Task[];
}

// Task form type
export interface TaskForm {
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  category_id?: string;
  due_date: string;
  estimated_duration?: number;
  progress?: number;
  assignee?: string;
  notes?: string;
  tags: string;
}

// Task editor properties
export interface TaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  categories: Category[];
  onSave: (taskId: string, data: {
    content: {
      title: string;
      description: string;
      status: Task['status'];
      priority: Task['priority'];
      category_id?: string;
      due_date?: string;
      estimated_duration?: number;
      progress?: number;
      assignee?: string;
      notes?: string;
    };
    tags: string[];
  }) => Promise<void>;
  title?: string;
}

// Task status type
export type TaskStatus = Task['status']

// Task priority type
export type TaskPriority = Task['priority']

// Filter types
export type FilterStatus = 'all' | TaskStatus
export type FilterPriority = 'all' | TaskPriority
export type FilterCategory = 'all' | string

// View mode type
export type ViewMode = 'list' | 'grid' | 'kanban'

// Task statistics type
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
