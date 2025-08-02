import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// 数据库表类型定义
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