import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const timeTrackingTools: Tool[] = [
  {
    name: 'get_day_time_spending',
    description: 'Get time tracking summary for a specific date. Shows total time spent and breakdown by tasks/activities. Uses time_entries table which links to timeline_items. Only tasks and activities can be time-tracked (memories cannot). Returns aggregated time data for the specified day.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date to query (required) in YYYY-MM-DD format (e.g., "2023-12-25"). Can be past, present, or future date.'
        },
        timezone: {
          type: 'string',
          description: 'Timezone identifier for interpreting the date (e.g., "America/New_York", "Asia/Shanghai", "Europe/London"). Determines the 00:00:00 to 23:59:59 boundary for the specified date. Defaults to server timezone if not provided.'
        },
        user_id: { type: 'string', description: 'User UUID (optional, defaults to authenticated user)' },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_task_time_entries',
    description: 'Get all time tracking entries for a specific task. Shows individual time tracking sessions with start/end times and durations. Useful for analyzing how time was spent on a task. Returns array of time_entries records.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task UUID to get time entries for' },
        start_date: { type: 'string', description: 'Filter entries starting from this date (YYYY-MM-DD format, inclusive)' },
        end_date: { type: 'string', description: 'Filter entries up to this date (YYYY-MM-DD format, inclusive)' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'start_task_timer',
    description: 'Start time tracking timer for a task. Creates a new time_entry record with start_at but no end_at. Only one timer can run at a time per user (enforced by unique constraint). Use after create_task to begin tracking work time.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task UUID to start timer for (from create_task or search_tasks)' },
        description: { type: 'string', description: 'Optional note about what you\'re working on in this session' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'stop_task_timer',
    description: 'Stop the currently running timer for a task. Sets end_at timestamp and calculates duration_minutes automatically. Updates task\'s tracked_minutes_total and tracked_segments_count cached values. Use when completing a work session.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task UUID to stop timer for (must have a running timer)' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'get_running_timer',
    description: 'Get the currently active timer if any. Returns the time_entry record with no end_at. Use to check if timer is running and what task is being tracked. Returns null if no timer is active.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
