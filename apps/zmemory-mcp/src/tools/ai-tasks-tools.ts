import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const aiTasksTools: Tool[] = [
  {
    name: 'get_ai_tasks',
    description: 'Get AI tasks assigned to agents, with filtering options for status, agent, mode, etc.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Filter by agent ID' },
        agent_name: { type: 'string', description: 'Filter by agent name (e.g., "claude", "gpt-4")' },
        status: {
          type: 'string',
          enum: ['pending', 'assigned', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'],
          description: 'Filter by task status'
        },
        mode: {
          type: 'string',
          enum: ['plan_only', 'dry_run', 'execute'],
          description: 'Filter by execution mode'
        },
        task_type: { type: 'string', description: 'Filter by task type (e.g., "coding", "research")' },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Number of tasks to return' },
        offset: { type: 'number', minimum: 0, default: 0, description: 'Pagination offset' },
        sort_by: {
          type: 'string',
          enum: ['assigned_at', 'due_at', 'priority', 'updated_at'],
          default: 'assigned_at',
          description: 'Sort field'
        },
        sort_order: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
          description: 'Sort order'
        },
      },
      required: [],
    },
  },
  {
    name: 'get_queued_tasks_for_agent',
    description: 'Get AI tasks queued for a specific agent (e.g., "claude" or "gpt-4")',
    inputSchema: {
      type: 'object',
      properties: {
        agent_name: { type: 'string', description: 'Agent name to get queued tasks for' },
      },
      required: ['agent_name'],
    },
  },
  {
    name: 'get_ai_task',
    description: 'Get detailed information about a specific AI task',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'accept_ai_task',
    description: 'Accept an AI task assignment and optionally provide estimates',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task ID to accept' },
        estimated_cost_usd: { type: 'number', minimum: 0, description: 'Estimated cost in USD' },
        estimated_duration_min: { type: 'number', minimum: 0, description: 'Estimated duration in minutes' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_ai_task',
    description: 'Update AI task status, progress, or results',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task ID' },
        status: {
          type: 'string',
          enum: ['in_progress', 'completed', 'failed', 'paused'],
          description: 'Updated status'
        },
        progress_message: { type: 'string', description: 'Progress update message' },
        error_message: { type: 'string', description: 'Error message if task failed' },
        execution_result: {
          type: 'object',
          properties: {
            output: { type: 'string', description: 'Task output/result text' },
            artifacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Artifact type (file, url, etc)' },
                  name: { type: 'string', description: 'Artifact name' },
                  content: { description: 'Artifact content or reference' },
                },
                required: ['type', 'name'],
              },
              description: 'Generated artifacts'
            },
            logs: { type: 'array', items: { type: 'string' }, description: 'Execution logs' },
            metrics: { type: 'object', description: 'Execution metrics' },
          },
          description: 'Task execution results',
        },
        actual_cost_usd: { type: 'number', minimum: 0, description: 'Actual cost incurred' },
        actual_duration_min: { type: 'number', minimum: 0, description: 'Actual duration in minutes' },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_ai_task',
    description: 'Mark an AI task as completed with results',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task ID' },
        output: { type: 'string', description: 'Task output/result text' },
        artifacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Artifact type' },
              name: { type: 'string', description: 'Artifact name' },
              content: { description: 'Artifact content' },
            },
            required: ['type', 'name'],
          },
          description: 'Generated artifacts'
        },
        logs: { type: 'array', items: { type: 'string' }, description: 'Execution logs' },
        metrics: { type: 'object', description: 'Execution metrics' },
        actual_cost_usd: { type: 'number', minimum: 0, description: 'Actual cost' },
        actual_duration_min: { type: 'number', minimum: 0, description: 'Actual duration' },
      },
      required: ['id'],
    },
  },
  {
    name: 'fail_ai_task',
    description: 'Mark an AI task as failed with an error message',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task ID' },
        error_message: { type: 'string', description: 'Error message explaining the failure' },
      },
      required: ['id', 'error_message'],
    },
  },
  {
    name: 'get_ai_task_stats',
    description: 'Get statistics about AI tasks (total, by status, by mode, etc.)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];