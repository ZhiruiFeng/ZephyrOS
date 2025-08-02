import { createClient } from '@supabase/supabase-js';

// 临时定义类型，避免导入问题
interface Task {
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

interface Memory {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'link' | 'file' | 'thought';
  tags?: string[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 数据库操作封装
export class DatabaseService {
  // 任务相关操作
  static async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    return { data, error };
  }

  static async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single();
    
    return { data, error };
  }

  static async updateTask(id: string, updates: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }

  static async deleteTask(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    
    return { error };
  }

  // 记忆相关操作
  static async getMemories() {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });
    
    return { data, error };
  }

  static async createMemory(memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('memories')
      .insert([memory])
      .select()
      .single();
    
    return { data, error };
  }

  static async updateMemory(id: string, updates: Partial<Memory>) {
    const { data, error } = await supabase
      .from('memories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }

  static async deleteMemory(id: string) {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);
    
    return { error };
  }
} 