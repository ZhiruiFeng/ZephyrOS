// 复用共享类型定义
export interface TaskContent {
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  category?: string;
}

export interface Task {
  id: string;
  type: 'task';
  content: TaskContent;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  type: 'task';
  content: TaskContent;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateTaskRequest {
  type?: 'task';
  content?: Partial<TaskContent>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TaskParams {
  status?: string;
  priority?: string;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
