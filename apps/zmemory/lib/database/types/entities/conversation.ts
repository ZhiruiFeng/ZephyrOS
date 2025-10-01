import { BaseEntity, FilterParams } from '../common';

// Message types
export type MessageType = 'user' | 'agent' | 'system';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  result?: any;
}

// Message entity - represents a single message in a conversation
export interface ChatMessage {
  id: string; // message_id in database
  type: MessageType;
  content: string;
  timestamp: Date;
  agent: string; // agent_name in database
  toolCalls?: ToolCall[];
  streaming?: boolean;
}

// Conversation/Session entity - represents a chat session
export interface Conversation extends BaseEntity {
  user_id: string;
  agent_id: string;
  title: string;
  summary?: string | null;
  message_count: number;
  is_archived: boolean;
  metadata?: Record<string, any> | null;
  messages?: ChatMessage[]; // Populated when fetching with messages
}

// Filter parameters for conversation queries
export interface ConversationFilterParams extends FilterParams {
  agent_id?: string;
  is_archived?: boolean;
  includeArchived?: boolean;
}

// Create conversation input (POST request)
export interface CreateConversationInput {
  agentId: string;
  title?: string;
  sessionId?: string; // Optional custom session ID
  messages?: Array<{
    id: string;
    type: MessageType;
    content: string;
    timestamp: string | Date;
    agent: string;
    toolCalls?: ToolCall[];
  }>;
}

// Update conversation input (PATCH request)
export interface UpdateConversationInput {
  title?: string;
  summary?: string;
  isArchived?: boolean;
}

// Add messages to conversation input
export interface AddMessagesInput {
  messages: Array<{
    id: string;
    type: MessageType;
    content: string;
    timestamp: string | Date;
    agent: string;
    toolCalls?: ToolCall[];
  }>;
}

// Search result type
export interface MessageSearchResult {
  sessionId: string;
  sessionTitle: string;
  message: ChatMessage;
}

// Conversation statistics
export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  archivedConversations: number;
  activeConversations: number;
}
