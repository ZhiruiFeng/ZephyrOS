import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const taskTools: Tool[] = [
  {
    name: 'create_task',
    description: 'Create a new task in ZMemory. Only title is required, but description and priority are recommended for better task management. Categories are auto-mapped from names like "work", "personal", "learning". Use start_task_timer after creation to begin tracking time. Returns created task with unique ID.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title (required) - what needs to be done' },
        description: { type: 'string', description: 'Detailed description of what needs to be done (optional but recommended for better task management)' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: 'Task status (defaults to "pending")' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority level (defaults to "medium")' },
        category: { type: 'string', description: 'Category name like "work", "personal", "learning" - system will auto-map to category ID' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD or ISO 8601 format (e.g., "2023-12-25" or "2023-12-25T15:30:00")' },
        timezone: { type: 'string', description: 'Timezone identifier for interpreting due_date (e.g., "America/New_York", "Asia/Shanghai")' },
        estimated_duration: { type: 'number', description: 'Estimated time to complete in minutes (e.g., 60 for 1 hour)' },
        assignee: { type: 'string', description: 'Person responsible for the task' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Task tags for organization (e.g., ["urgent", "client-work"])' },
        notes: { type: 'string', description: 'Additional notes or context for the task' },
      },
      required: ['title'],
    },
  },
  {
    name: 'search_tasks',
    description: 'Search and filter tasks by status, priority, category, keywords, or date ranges. Use to find specific tasks, get task overviews, or prepare for updates. Returns array of matching tasks with full details. Commonly followed by update_task or get_task for specific operations.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: 'Filter by task status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Filter by task priority level' },
        category: { type: 'string', description: 'Filter by category name' },
        assignee: { type: 'string', description: 'Filter by person responsible for tasks' },
        keyword: { type: 'string', description: 'Search keywords in task title and description' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (tasks must have all specified tags)' },
        due_after: { type: 'string', description: 'Find tasks due after this date (YYYY-MM-DD)' },
        due_before: { type: 'string', description: 'Find tasks due before this date (YYYY-MM-DD)' },
        created_after: { type: 'string', description: 'Find tasks created after this date (YYYY-MM-DD)' },
        created_before: { type: 'string', description: 'Find tasks created before this date (YYYY-MM-DD)' },
        timezone: { type: 'string', description: 'Timezone for date interpretation (e.g., "America/New_York")' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20, description: 'Maximum number of tasks to return' },
        offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of tasks to skip (for pagination)' },
        sort_by: { type: 'string', enum: ['created_at', 'due_date', 'priority', 'updated_at'], default: 'created_at', description: 'Field to sort results by' },
        sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc', description: 'Sort order (ascending or descending)' },
      },
      required: [],
    },
  },
  {
    name: 'get_task',
    description: 'Get detailed information about a specific task by ID. Use when you need complete task details including time entries, history, and metadata. Commonly used after search_tasks to get full details.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique task ID from create_task or search_tasks results' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task. Provide only the fields you want to change. Use after search_tasks or get_task to modify task details. Can update status, priority, due dates, and other properties.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique task ID to update' },
        title: { type: 'string', description: 'New task title' },
        description: { type: 'string', description: 'New task description' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: 'New task status' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'New priority level' },
        category: { type: 'string', description: 'New category name (will be auto-mapped to ID)' },
        due_date: { type: 'string', description: 'New due date (YYYY-MM-DD or ISO 8601)' },
        timezone: { type: 'string', description: 'Timezone for due_date interpretation' },
        estimated_duration: { type: 'number', description: 'New estimated duration in minutes' },
        progress: { type: 'number', minimum: 0, maximum: 100, description: 'Completion percentage (0-100)' },
        assignee: { type: 'string', description: 'New person responsible for task' },
        tags: { type: 'array', items: { type: 'string' }, description: 'New tags list (replaces existing tags)' },
        notes: { type: 'string', description: 'Additional notes or updates' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_task_stats',
    description: 'Get task statistics and summary data. Shows task counts by status, priority, category, and trends over time. Use for dashboard views and productivity analysis.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_task_updates_for_today',
    description: 'Get all tasks that were created, modified, or completed today. Use for daily reviews, progress tracking, and understanding daily productivity.',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: 'Timezone for "today" calculation (e.g., "America/New_York")' },
      },
      required: [],
    },
  },
  {
    name: 'get_task_updates_for_date',
    description: 'Get all tasks that were created, modified, or completed on a specific date. Use for historical analysis and specific day reviews.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to analyze (YYYY-MM-DD format)' },
        timezone: { type: 'string', description: 'Timezone for date interpretation' },
      },
      required: ['date'],
    },
  },
];