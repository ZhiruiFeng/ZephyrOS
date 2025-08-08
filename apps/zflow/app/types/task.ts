// 任务类型定义
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  due_date?: string;
  tags?: string[];
}

// 任务表单类型
export interface TaskForm {
  title: string;
  description: string;
  status: Task['status'];
  priority: Task['priority'];
  due_date: string;
  tags: string;
}

// 任务编辑器属性
export interface TaskEditorProps {
  isOpen: boolean;
  onClose: () => void;
  task: any | null;
  onSave: (taskId: string, data: {
    content: {
      title: string;
      description: string;
      status: Task['status'];
      priority: Task['priority'];
      due_date?: string;
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

// 视图模式类型
export type ViewMode = 'list' | 'grid'
