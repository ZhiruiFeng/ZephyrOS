import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const activityTools: Tool[] = [
  {
    name: 'create_activity',
    description: 'Record a leisure/wellness activity with mood, energy, and satisfaction tracking. Use for logging non-goal-oriented experiences like exercise, meditation, reading, or socializing. Unlike tasks, activities focus on experiential quality and wellbeing metrics. Syncs to timeline_items table (type=activity). Returns created activity with ID.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Activity title (required) - what you did (e.g., "Morning run", "Read fiction book")', maxLength: 500 },
        description: { type: 'string', description: 'Detailed description of the activity and what happened' },
        activity_type: {
          type: 'string',
          enum: ['exercise', 'meditation', 'reading', 'music', 'socializing', 'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other'],
          description: 'Activity category (required) - type of experience for tracking patterns'
        },
        started_at: { type: 'string', format: 'date-time', description: 'When activity started (ISO 8601 format, e.g., "2023-12-25T14:30:00Z")' },
        ended_at: { type: 'string', format: 'date-time', description: 'When activity ended (ISO 8601 format)' },
        duration_minutes: { type: 'number', description: 'How long it lasted in minutes (auto-calculated from start/end if not provided)' },
        mood_before: { type: 'integer', minimum: 1, maximum: 10, description: 'Mood level before activity (1=very low, 10=excellent) - track emotional impact' },
        mood_after: { type: 'integer', minimum: 1, maximum: 10, description: 'Mood level after activity (1=very low, 10=excellent)' },
        energy_before: { type: 'integer', minimum: 1, maximum: 10, description: 'Energy level before activity (1=exhausted, 10=highly energized)' },
        energy_after: { type: 'integer', minimum: 1, maximum: 10, description: 'Energy level after activity (1=exhausted, 10=highly energized)' },
        satisfaction_level: { type: 'integer', minimum: 1, maximum: 10, description: 'Overall satisfaction with the activity (1=disappointed, 10=deeply fulfilling)' },
        intensity_level: {
          type: 'string',
          enum: ['low', 'moderate', 'high'],
          description: 'Physical/mental intensity (low=relaxing, moderate=engaged, high=intense)'
        },
        location: { type: 'string', description: 'Where the activity took place (e.g., "Central Park", "home", "gym")' },
        weather: { type: 'string', description: 'Weather conditions during activity (e.g., "sunny", "rainy")' },
        companions: { type: 'array', items: { type: 'string' }, description: 'Names of people who joined you (e.g., ["Alice", "Bob"])' },
        notes: { type: 'string', description: 'Additional notes or observations about the experience' },
        insights: { type: 'string', description: 'Key realizations or learnings from this activity' },
        gratitude: { type: 'string', description: 'What you are grateful for from this experience' },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'cancelled'],
          default: 'completed',
          description: 'Activity status (active=ongoing, completed=finished, cancelled=did not complete)'
        },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for organization (e.g., ["outdoor", "solo", "weekend"])' },
        category_id: { type: 'string', description: 'Category UUID for grouping (optional, can be obtained from categories table)' },
      },
      required: ['title', 'activity_type'],
    },
  },
  {
    name: 'search_activities',
    description: 'Search and filter activity records by type, mood, satisfaction, time range, and more. Use to find patterns in wellbeing data, analyze what activities boost mood/energy, or review past experiences. Returns array of matching activities.',
    inputSchema: {
      type: 'object',
      properties: {
        activity_type: {
          type: 'string',
          enum: ['exercise', 'meditation', 'reading', 'music', 'socializing', 'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other'],
          description: 'Filter by specific activity type'
        },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'cancelled'],
          description: 'Filter by completion status'
        },
        intensity_level: {
          type: 'string',
          enum: ['low', 'moderate', 'high'],
          description: 'Filter by intensity level'
        },
        min_satisfaction: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'Only return activities with satisfaction >= this value (find most fulfilling activities)'
        },
        min_mood_after: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: 'Only return activities where post-activity mood >= this value (find mood boosters)'
        },
        location: { type: 'string', description: 'Filter by location (exact match or partial)' },
        from: { type: 'string', format: 'date-time', description: 'Filter activities started on or after this timestamp' },
        to: { type: 'string', format: 'date-time', description: 'Filter activities started on or before this timestamp' },
        search: { type: 'string', description: 'Search keywords in title, description, notes, and insights' },
        tags: { type: 'string', description: 'Filter by tags (comma-separated, e.g., "outdoor,solo")' },
        category_id: { type: 'string', description: 'Filter by category UUID' },
        sort_by: {
          type: 'string',
          enum: ['started_at', 'satisfaction_level', 'mood_after', 'title', 'created_at'],
          default: 'started_at',
          description: 'Sort results by this field'
        },
        sort_order: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
          description: 'Sort direction (asc=oldest/lowest first, desc=newest/highest first)'
        },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Maximum number of results to return' },
        offset: { type: 'number', minimum: 0, default: 0, description: 'Number of results to skip (for pagination)' },
      },
      required: [],
    },
  },
  {
    name: 'get_activity',
    description: 'Get complete details of a specific activity by ID. Use after search_activities to view full activity information including all mood/energy metrics, companions, and reflections.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Activity UUID from create_activity or search_activities' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_activity',
    description: 'Update an existing activity record. Use to add reflections after completion, correct details, or update status. Only provide fields you want to change. Commonly used to add insights/gratitude after the fact.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Activity UUID to update' },
        title: { type: 'string', description: 'New activity title' },
        description: { type: 'string', description: 'New activity description' },
        activity_type: {
          type: 'string',
          enum: ['exercise', 'meditation', 'reading', 'music', 'socializing', 'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other'],
          description: 'New activity type'
        },
        ended_at: { type: 'string', format: 'date-time', description: 'New end time (use to mark ongoing activity as completed)' },
        mood_after: { type: 'integer', minimum: 1, maximum: 10, description: 'Updated post-activity mood rating' },
        energy_after: { type: 'integer', minimum: 1, maximum: 10, description: 'Updated post-activity energy level' },
        satisfaction_level: { type: 'integer', minimum: 1, maximum: 10, description: 'Updated satisfaction rating' },
        intensity_level: { type: 'string', enum: ['low', 'moderate', 'high'], description: 'Updated intensity level' },
        notes: { type: 'string', description: 'Updated or additional notes' },
        insights: { type: 'string', description: 'New insights or reflections gained from the activity' },
        gratitude: { type: 'string', description: 'Updated gratitude notes' },
        status: { type: 'string', enum: ['active', 'completed', 'cancelled'], description: 'New status' },
        tags: { type: 'array', items: { type: 'string' }, description: 'New tags list (replaces existing tags)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_activity_stats',
    description: 'Get aggregate statistics and insights about user\'s activity patterns. Shows activity type distribution, average mood/energy impacts, satisfaction trends, and more. Use for wellbeing analytics and pattern discovery.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
