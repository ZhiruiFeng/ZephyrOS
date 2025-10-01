import { z } from 'zod';

/**
 * Message type enum
 */
const MessageTypeSchema = z.enum(['user', 'agent', 'system']);

/**
 * Tool call schema
 */
const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.any()),
  result: z.any().optional()
});

/**
 * Message schema
 */
const MessageSchema = z.object({
  id: z.string(),
  type: MessageTypeSchema,
  content: z.string(),
  timestamp: z.union([z.string(), z.date()]).transform(val =>
    typeof val === 'string' ? new Date(val) : val
  ),
  agent: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
  streaming: z.boolean().optional()
});

/**
 * Schema for creating a conversation
 */
export const CreateConversationSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  title: z.string().optional(),
  sessionId: z.string().optional(),
  messages: z.array(MessageSchema).optional()
});

/**
 * Schema for updating a conversation
 */
export const UpdateConversationSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  summary: z.string().optional(),
  isArchived: z.boolean().optional()
});

/**
 * Schema for query parameters when listing conversations
 */
export const ConversationQuerySchema = z.object({
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 50),
  includeArchived: z.string().optional().transform(v => v === 'true'),
  agent_id: z.string().optional(),
  offset: z.string().optional().transform(v => v ? parseInt(v, 10) : undefined)
});

/**
 * Schema for adding messages to a conversation
 */
export const AddMessagesSchema = z.object({
  messages: z.array(MessageSchema).min(1, 'At least one message is required')
});

/**
 * Schema for message search query parameters
 */
export const MessageSearchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.string().optional().transform(v => v ? parseInt(v, 10) : 20)
});

/**
 * Schema for deleting a conversation
 */
export const DeleteConversationSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional()
});

// Type exports
export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>;
export type ConversationQueryParams = z.infer<typeof ConversationQuerySchema>;
export type AddMessagesInput = z.infer<typeof AddMessagesSchema>;
export type MessageSearchParams = z.infer<typeof MessageSearchSchema>;
export type DeleteConversationInput = z.infer<typeof DeleteConversationSchema>;
