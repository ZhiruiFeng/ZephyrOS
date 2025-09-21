// Basic types for the iOS app
// These should align with the shared types from @zephyros/shared

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Memory {
  id: string;
  title?: string;
  content: string;
  type: 'note' | 'conversation' | 'document';
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Conversation {
  id: string;
  title?: string;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}