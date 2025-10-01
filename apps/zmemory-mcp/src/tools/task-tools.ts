import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const taskTools: Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task in ZMemory for goal-oriented work. Tasks are time-trackable items that sync to timeline_items table (type=task). Only title is required, but description and priority are recommended. Categories are auto-mapped from names. Use start_task_timer after creation to begin tracking time. Tasks support subtasks hierarchy. Returns created task with UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required) - concise description of what needs to be done' },
        description: { type: 'string', description: 'Detailed description explaining requirements, context, and acceptance criteria (recommended for clarity)' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: 'Task status (defaults to "pending" - task not yet started)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority level (defaults to "medium" for normal importance)' },
        category: { type: 'string', description: 'Category name like "work", "personal", "learning" - system auto-maps to category UUID from categories table' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD or ISO 8601 format (e.g., "2023-12-25" or "2023-12-25T15:30:00Z")' },
        timezone: { type: 'string', description: 'Timezone identifier for interpreting due_date (e.g., "America/New_York", "Asia/Shanghai"). Defaults to server timezone if not provided.' },
        estimated_duration: { type: 'number', description: 'Estimated time to complete in minutes (e.g., 60 for 1 hour, 120 for 2 hours)' },
        assignee: { type: 'string', description: 'Person responsible for completing the task (name or identifier)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags for organization and filtering (e.g., ["urgent", "client-work", "research"])' },
        notes: { type: 'string', description: 'Additional notes, context, or instructions for the task' },
      },
      required: ['title'],
    },
  },
  {
    name: 'search_tasks',
    description: 'Search and filter tasks by status, priority, category, keywords, date ranges, and more. Use to find specific tasks, get task overviews, or prepare for updates. Returns array of matching tasks from tasks table with full details. Commonly followed by update_task or get_task for detailed operations.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: 'Filter by task status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Filter by priority level' },
        category: { type: 'string', description: 'Filter by category name (partial match supported)' },
        assignee: { type: 'string', description: 'Filter by assigned person (partial match)' },
        keyword: { type: 'string', description: 'Search keywords in task title and description (case-insensitive)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (tasks must have ALL specified tags - AND logic)' },
        due_after: { type: 'string', description: 'Find tasks with due_date >= this date (YYYY-MM-DD format)' },
        due_before: { type: 'string', description: 'Find tasks with due_date <= this date (YYYY-MM-DD format)' },
        created_after: { type: 'string', description: 'Find tasks created on or after this date (YYYY-MM-DD format)' },
        created_before: { type: 'string', description: 'Find tasks created on or before this date (YYYY-MM-DD format)' },
        timezone: { type: 'string', description: 'Timezone for date interpretation (e.g., "America/New_York"). Defaults to server timezone.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Maximum number of tasks to return' },
        offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of tasks to skip (for pagination)' },
        sort_by: { type: 'string', enum: ['created_at', 'due_date', 'priority', 'updated_at'], default: 'created_at', description: 'Field to sort results by' },
        sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc', description: 'Sort order (asc=oldest/lowest first, desc=newest/highest first)' },
      },
      required: [],
    },
  },
  {
    name: 'get_task',
    description: 'Get detailed information about a specific task by UUID. Returns complete task details including time tracking summary (tracked_minutes_total, tracked_segments_count), subtask info, progress, and all metadata. Use after search_tasks to view full task details.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task UUID from create_task or search_tasks' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task. Provide only the fields you want to change - partial updates supported. Use after search_tasks or get_task to modify task details. Can update status, priority, due dates, progress, and other properties. Triggers sync to timeline_items table.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Task UUID to update' },
        title: { type: 'string', description: 'New task title' },
        description: { type: 'string', description: 'New task description' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: 'New status (setting to completed sets completion_date automatically)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'New priority level' },
        category: { type: 'string', description: 'New category name (auto-mapped to category UUID)' },
        due_date: { type: 'string', description: 'New due date (YYYY-MM-DD or ISO 8601 format)' },
        timezone: { type: 'string', description: 'Timezone for due_date interpretation' },
        estimated_duration: { type: 'number', description: 'New estimated duration in minutes' },
        progress: { type: 'number', minimum: 0, maximum: 100, description: 'Completion percentage (0-100). Can be auto-calculated from subtasks if progress_calculation is set.' },
        assignee: { type: 'string', description: 'New person responsible for task' },
        tags: { type: 'array', items: { type: 'string' }, description: 'New tags list (completely replaces existing tags)' },
        notes: { type: 'string', description: 'Additional notes or updates' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_task_stats',
    description: 'Get aggregate task statistics and summary data. Shows task counts by status, priority, category, completion rates, and trends over time. Includes time tracking summary. Use for dashboard views, productivity analysis, and workload assessment.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_task_updates_for_today',
    description: 'Get all tasks that were created, modified, or completed today. Useful for daily reviews, standup reports, progress tracking, and understanding daily productivity. Returns tasks with their current state and what changed.',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Timezone for "today" calculation (e.g., "America/New_York"). Determines the 00:00:00-23:59:59 boundary for "today". Defaults to server timezone.' },
      },
      required: [],
    },
  },
  {
    name: 'get_task_updates_for_date',
    description: 'Get all tasks that were created, modified, or completed on a specific date. Use for historical analysis, retrospectives, time tracking verification, and specific day reviews. Returns tasks with their state changes.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to analyze (YYYY-MM-DD format, e.g., "2023-12-25")' },
        timezone: { type: 'string', description: 'Timezone for date interpretation. Determines the 00:00:00-23:59:59 boundary for the specified date. Defaults to server timezone.' },
      },
      required: ['date'],
    },
  },
];
