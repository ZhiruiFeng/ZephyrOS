// 分类类型定义
export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

// 任务关系类型
export type TaskRelationType = 'subtask' | 'related' | 'dependency' | 'blocked_by';

export interface TaskRelation {
  id: string;
  parent_task_id: string;
  child_task_id: string;
  relation_type: TaskRelationType;
  created_at: string;
}

// 任务类型定义
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
  estimated_duration?: number; // 分钟
  progress: number; // 0-100
  assignee?: string;
  completion_date?: string;
  notes?: string;
  tags?: string[];
  // 关系数据
  subtasks?: Task[];
  related_tasks?: Task[];
  dependencies?: Task[];
  blocked_by?: Task[];
}

// 任务表单类型
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

// 任务编辑器属性
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

// 任务状态类型
export type TaskStatus = Task['status']

// 任务优先级类型
export type TaskPriority = Task['priority']

// 筛选器类型
export type FilterStatus = 'all' | TaskStatus
export type FilterPriority = 'all' | TaskPriority
export type FilterCategory = 'all' | string

// 视图模式类型
export type ViewMode = 'list' | 'grid' | 'kanban'

// 任务统计类型
export interface TaskStats {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  by_category: Record<string, number>;
  overdue: number;
  due_today: number;
  due_this_week: number;
  completion_rate: number;
  average_completion_time: number; // 天数
}
