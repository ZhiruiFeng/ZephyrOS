import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const memoryTools: Tool[] = [
  {
    name: 'add_memory',
    description: 'Create a new memory/note in ZMemory with rich metadata. Use for capturing thoughts, insights, quotes, learnings, or any information worth remembering. Memories are non-time-consuming items that appear on timeline but cannot be time-tracked. Supports emotional context, location, importance rating, and tags. Syncs to timeline_items table (type=memory). Returns created memory with UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Main memory content (required) - the information/thought/insight you want to preserve', minLength: 1 },
        memory_type: {
          type: 'string',
          enum: ['note', 'link', 'file', 'thought', 'quote', 'insight'],
          default: 'note',
          description: 'Type of memory: "note"=general information, "thought"=personal reflection, "quote"=memorable quotes, "insight"=key realization/learning, "link"=web resource reference, "file"=document reference'
        },
        title: { type: 'string', description: 'Optional title override (auto-generated from note content if not provided)' },
        emotion_valence: {
          type: 'integer',
          minimum: -5,
          maximum: 5,
          description: 'Emotional tone of the memory (-5=very negative/sad, 0=neutral, +5=very positive/joyful). Track emotional context.'
        },
        emotion_arousal: {
          type: 'integer',
          minimum: 0,
          maximum: 5,
          description: 'Emotional intensity level (0=calm/passive, 5=highly excited/activated). Measures activation level regardless of positive/negative.'
        },
        energy_delta: {
          type: 'integer',
          minimum: -5,
          maximum: 5,
          description: 'How this memory affects energy (-5=very draining, 0=neutral, +5=very energizing). Track impact on vitality.'
        },
        place_name: { type: 'string', description: 'Location name where this memory occurred or is associated with (e.g., "Central Park", "office", "home")' },
        latitude: { type: 'number', description: 'Geographic latitude coordinate (decimal degrees, -90 to 90)' },
        longitude: { type: 'number', description: 'Geographic longitude coordinate (decimal degrees, -180 to 180)' },
        is_highlight: { type: 'boolean', default: false, description: 'Mark as important/highlight memory for easier retrieval and review' },
        salience_score: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Importance/relevance score (0.0=trivial, 1.0=critical). Used for prioritization and filtering.'
        },
        category_id: { type: 'string', description: 'Category UUID for organization (optional, from categories table)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization and search (e.g., ["work", "idea", "urgent"])' },
        happened_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time', description: 'When the event/experience started (ISO 8601)' },
            end: { type: 'string', format: 'date-time', description: 'When the event/experience ended (ISO 8601)' }
          },
          description: 'Time range when the remembered event actually occurred (different from when you captured it). Stored as tstzrange in database.'
        },
        captured_at: { type: 'string', format: 'date-time', description: 'When you recorded this memory (defaults to now if not specified)' }
      },
      required: ['note'],
    },
  },
  {
    name: 'search_memories',
    description: 'Search and filter memories with advanced criteria including text search, emotional filters, location, time ranges, and importance. Use to retrieve specific memories, find patterns, or review past insights. Returns array of matching memories.',
    inputSchema: {
      type: 'object',
      properties: {
        memory_type: {
          type: 'string',
          enum: ['note', 'link', 'file', 'thought', 'quote', 'insight'],
          description: 'Filter by memory type category'
        },
        status: {
          type: 'string',
          enum: ['active', 'archived', 'deleted'],
          description: 'Filter by status (active=current, archived=stored away, deleted=soft-deleted)'
        },
        is_highlight: { type: 'boolean', description: 'Only return highlighted/important memories when true' },
        search: { type: 'string', description: 'Full-text search across note content, title, and metadata. Searches title_override and note fields.' },
        tags: { type: 'string', description: 'Filter by tags (comma-separated, e.g., "work,idea"). Returns memories having ANY of the tags.' },
        place_name: { type: 'string', description: 'Filter by location name (partial match supported)' },
        min_emotion_valence: {
          type: 'integer',
          minimum: -5,
          maximum: 5,
          description: 'Only return memories with emotional tone >= this value (find positive memories)'
        },
        max_emotion_valence: {
          type: 'integer',
          minimum: -5,
          maximum: 5,
          description: 'Only return memories with emotional tone <= this value (find negative memories)'
        },
        min_salience: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Only return memories with importance score >= this value (find most important)'
        },
        captured_from: { type: 'string', format: 'date-time', description: 'Filter memories captured on or after this timestamp' },
        captured_to: { type: 'string', format: 'date-time', description: 'Filter memories captured on or before this timestamp' },
        near_lat: { type: 'number', description: 'Search for memories near this latitude (requires near_lng and distance_km)' },
        near_lng: { type: 'number', description: 'Search for memories near this longitude (requires near_lat and distance_km)' },
        distance_km: { type: 'number', description: 'Search radius in kilometers for location-based search' },
        category_id: { type: 'string', description: 'Filter by category UUID' },
        sort_by: {
          type: 'string',
          enum: ['captured_at', 'happened_at', 'salience_score', 'emotion_valence', 'updated_at'],
          default: 'captured_at',
          description: 'Sort field (happened_at uses lower bound of happened_range)'
        },
        sort_order: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
          description: 'Sort direction (asc=oldest/lowest first, desc=newest/highest first)'
        },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Maximum number of results' },
        offset: { type: 'number', minimum: 0, default: 0, description: 'Pagination offset (number to skip)' },
      },
      required: [],
    },
  },
  {
    name: 'get_memory',
    description: 'Get complete details of a specific memory by UUID. Use after search_memories to view full memory content including all metadata, emotional context, and location data.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Memory UUID from add_memory or search_memories' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_memory',
    description: 'Update an existing memory. Use to refine content, add emotional context, update importance rating, or change tags. Only provide fields you want to change. Commonly used to enhance memories with additional insights or correct information.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Memory UUID to update' },
        note: { type: 'string', description: 'Updated memory content' },
        title: { type: 'string', description: 'Updated title override' },
        memory_type: {
          type: 'string',
          enum: ['note', 'link', 'file', 'thought', 'quote', 'insight'],
          description: 'Updated memory type'
        },
        emotion_valence: { type: 'integer', minimum: -5, maximum: 5, description: 'Updated emotional tone (-5 to +5)' },
        emotion_arousal: { type: 'integer', minimum: 0, maximum: 5, description: 'Updated emotional intensity (0 to 5)' },
        energy_delta: { type: 'integer', minimum: -5, maximum: 5, description: 'Updated energy impact (-5 to +5)' },
        place_name: { type: 'string', description: 'Updated location name' },
        is_highlight: { type: 'boolean', description: 'Toggle highlight/important status' },
        salience_score: { type: 'number', minimum: 0, maximum: 1, description: 'Updated importance score (0.0 to 1.0)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'New tags list (replaces existing tags completely)' },
        category_id: { type: 'string', description: 'New category UUID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_memory',
    description: 'Delete a memory by UUID. This performs a soft delete (sets status to deleted) rather than permanent removal. Memory can potentially be recovered.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Memory UUID to delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_memory_stats',
    description: 'Get aggregate statistics about user\'s memory collection. Shows total count, type distribution, status breakdown, emotional patterns, and highlight counts. Use for analytics and understanding memory collection patterns.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
