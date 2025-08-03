// Database type definitions
export interface Memory {
  id: string;
  type: string;
  content: any;
  tags?: string[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateMemoryRequest {
  type: string;
  content: any;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateMemoryRequest {
  type?: string;
  content?: any;
  tags?: string[];
  metadata?: Record<string, any>;
}

// Task interface (content within Memory)
export interface TaskContent {
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
}

// Database table names
export const TABLES = {
  MEMORIES: 'memories',
} as const;

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Common utility functions
export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US');
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('en-US');
}; 