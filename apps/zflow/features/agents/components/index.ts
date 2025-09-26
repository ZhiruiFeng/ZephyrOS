/**
 * Agents Feature - UI Components
 *
 * All agents UI components are now internal to the feature.
 */

// Primary chat UI
export { default as AgentChatWindow } from './AgentChatWindow'
export { StreamingMessage } from './StreamingMessage'
export { AgentSelector } from './AgentSelector'
export { ToolCallDisplay } from './ToolCallDisplay'
export { ConversationHistory } from './ConversationHistory'

// Ancillary UI
export { default as MCPStatusIndicator } from './MCPStatusIndicator'
export { ConversationHistorySidebar } from './ConversationHistorySidebar'
export { ConversationListItem } from './ConversationListItem'
export { ConversationSearch } from './ConversationSearch'

// Types passthrough (avoid clashes with feature domain types by aliasing)
export type { Message as LegacyMessage, ToolCall as LegacyToolCall } from '../types/agents'
