import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const timelineTools: Tool[] = [
  {
    name: 'get_timeline_items',
    description: 'Get unified timeline view of all items (tasks, activities, memories). Queries the timeline_items supertype table which is automatically synced from subtypes. Use for chronological views, cross-type filtering, and holistic time management. Returns array of timeline items with type indicators.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['task', 'activity', 'routine', 'habit', 'memory'],
          description: 'Filter by item type (task=goal-oriented work, activity=wellness/leisure, memory=captured insights)'
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'completed', 'cancelled', 'archived'],
          description: 'Filter by status (unified across all types)'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Filter by priority level (applies to tasks; memories auto-compute priority from salience_score)'
        },
        category_id: { type: 'string', description: 'Filter by category UUID (shared across all types)' },
        search: { type: 'string', description: 'Full-text search across titles and descriptions of all timeline item types' },
        tags: { type: 'string', description: 'Filter by tags (comma-separated, returns items with ANY of the tags)' },
        is_highlight: { type: 'boolean', description: 'Filter for important items (primarily for memories with is_highlight=true)' },
        memory_type: {
          type: 'string',
          enum: ['note', 'link', 'file', 'thought', 'quote', 'insight'],
          description: 'Filter memories by specific type (only applies when type=memory or not filtered)'
        },
        render_on_timeline: { type: 'boolean', description: 'Filter by whether item should appear on timeline visualization (memories can set this to false)' },
        sort_by: {
          type: 'string',
          enum: ['created_at', 'updated_at', 'title', 'priority', 'captured_at', 'salience_score'],
          default: 'created_at',
          description: 'Field to sort by (some fields like captured_at only apply to specific types)'
        },
        sort_order: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
          description: 'Sort direction (asc=oldest/lowest first, desc=newest/highest first)'
        },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 50, description: 'Maximum number of items to return' },
        offset: { type: 'number', minimum: 0, default: 0, description: 'Number of items to skip for pagination' },
      },
      required: [],
    },
  },
  {
    name: 'create_timeline_item',
    description: 'Create a new timeline item directly via the supertype table. Generally prefer using specific tools (create_task, create_activity, add_memory) which provide type-specific validation. This is a low-level tool for advanced use cases. Returns created timeline item.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['task', 'activity', 'routine', 'habit', 'memory'],
          description: 'Item type (required) - determines which subtype table will be synced'
        },
        title: { type: 'string', minLength: 1, maxLength: 500, description: 'Item title (required)' },
        description: { type: 'string', description: 'Item description (optional)' },
        start_time: { type: 'string', format: 'date-time', description: 'Start timestamp (ISO 8601, used for time range on timeline)' },
        end_time: { type: 'string', format: 'date-time', description: 'End timestamp (ISO 8601, for tasks this is due_date, for activities this is ended_at)' },
        category_id: { type: 'string', description: 'Category UUID for organization' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags array for categorization' },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'completed', 'cancelled', 'archived'],
          default: 'active',
          description: 'Item status (default: active)'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
          description: 'Priority level (default: medium)'
        },
        metadata: { type: 'object', description: 'Additional type-specific metadata as JSON object' },
      },
      required: ['type', 'title'],
    },
  },
  {
    name: 'get_timeline_insights',
    description: 'Get analytical insights about timeline data including productivity trends, activity patterns, time allocation breakdowns, and completion rates. Aggregates data across tasks, activities, and memories for the specified time range. Use for productivity analytics and pattern discovery.',
    inputSchema: {
      type: 'object',
      properties: {
        date_range: {
          type: 'string',
          enum: ['today', 'week', 'month', 'quarter', 'year'],
          default: 'week',
          description: 'Analysis time window (today=last 24h, week=last 7 days, etc.)'
        },
        timezone: { type: 'string', description: 'Timezone for date boundary calculation (e.g., "America/New_York")' },
      },
      required: [],
    },
  },
  {
    name: 'search_across_timeline',
    description: 'Advanced search across all timeline item types with natural language query support. Searches titles, descriptions, notes, and metadata. Supports combining multiple item types and date filtering. Use for finding related items or exploring connections between tasks, activities, and memories.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query text (supports natural language, searches across all text fields)' },
        include_types: {
          type: 'array',
          items: { type: 'string', enum: ['task', 'activity', 'routine', 'habit', 'memory'] },
          description: 'Limit search to specific item types (if not specified, searches all types)'
        },
        date_from: { type: 'string', format: 'date-time', description: 'Only search items created/captured on or after this date' },
        date_to: { type: 'string', format: 'date-time', description: 'Only search items created/captured on or before this date' },
        context_depth: {
          type: 'integer',
          minimum: 1,
          maximum: 5,
          default: 2,
          description: 'Context/relevance depth for semantic search (higher=more results but less precise)'
        },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Maximum number of results' },
      },
      required: ['query'],
    },
  },
];
