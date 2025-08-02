// 数据库类型定义
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  due_date?: string;
  tags?: string[];
}

export interface Memory {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'link' | 'file' | 'thought';
  tags?: string[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// 数据库表名
export const TABLES = {
  TASKS: 'tasks',
  MEMORIES: 'memories',
  TAGS: 'tags'
} as const;

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 通用工具函数
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('zh-CN');
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('zh-CN');
}; 