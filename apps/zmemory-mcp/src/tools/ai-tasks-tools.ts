import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const aiTasksTools: Tool[] = [
  {
    name: 'get_ai_tasks',
    description: 'Query AI tasks assigned to agents. AI tasks are work items delegated to AI agents (stored in tasks table with is_ai_task=true). Use to view task queue, monitor progress, or filter by agent/status/mode. Returns array of AI task records with assignment details.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Filter by specific agent UUID' },
        agent_name: { type: 'string', description: 'Filter by agent name (e.g., "claude", "gpt-4", "gemini")' },
        status: {
          type: 'string',
          enum: ['pending', 'assigned', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'],
          description: 'Filter by task lifecycle status (pending=created but not assigned, assigned=accepted by agent, in_progress=actively working)'
        },
        mode: {
          type: 'string',
          enum: ['plan_only', 'dry_run', 'execute'],
          description: 'Filter by execution mode (plan_only=just create plan, dry_run=simulate without changes, execute=make actual changes)'
        },
        task_type: { type: 'string', description: 'Filter by task type category (e.g., "coding", "research", "writing", "analysis")' },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: 'Maximum number of tasks to return' },
        offset: { type: 'number', minimum: 0, default: 0, description: 'Pagination offset (number to skip)' },
        sort_by: {
          type: 'string',
          enum: ['assigned_at', 'due_at', 'priority', 'updated_at'],
          default: 'assigned_at',
          description: 'Field to sort by'
        },
        sort_order: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
          description: 'Sort direction (asc=oldest first, desc=newest first)'
        },
      },
      required: [],
    },
  },
  {
    name: 'get_queued_tasks_for_agent',
    description: 'Get all queued (pending/assigned) AI tasks for a specific agent. Use for agents to check their work queue and pick up next tasks. Filters to status IN (pending, assigned) for the specified agent. Returns tasks ordered by priority and due date.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_name: { type: 'string', description: 'Agent name to get queue for (e.g., "claude", "gpt-4")' },
      },
      required: ['agent_name'],
    },
  },
  {
    name: 'get_ai_task',
    description: 'Get detailed information about a specific AI task by ID. Returns complete task details including instructions, context, constraints, progress, results, and execution metadata. Use before accepting or updating a task.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task UUID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'accept_ai_task',
    description: 'Accept an AI task assignment and optionally provide cost/time estimates. Changes status from "pending" to "assigned". Agent should call this before starting work. Use after get_ai_task to review requirements and provide estimates.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task UUID to accept' },
        estimated_cost_usd: { type: 'number', minimum: 0, description: 'Estimated API/compute cost in USD (optional but recommended for budgeting)' },
        estimated_duration_min: { type: 'number', minimum: 0, description: 'Estimated execution time in minutes (optional but recommended for planning)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_ai_task',
    description: 'Update AI task status, progress, or results. Use during execution to report progress, on completion to provide results, or on failure to report errors. Can update status, add progress messages, attach execution results, and record actual costs. Flexible update - provide only fields you want to change.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task UUID to update' },
        status: {
          type: 'string',
          enum: ['in_progress', 'completed', 'failed', 'paused'],
          description: 'New status (in_progress=working, completed=done successfully, failed=encountered error, paused=temporarily stopped)'
        },
        progress_message: { type: 'string', description: 'Human-readable progress update (e.g., "Analyzing codebase...", "Generated 3 artifacts")' },
        error_message: { type: 'string', description: 'Error description if task failed (required when status=failed)' },
        execution_result: {
          type: 'object',
          properties: {
            output: { type: 'string', description: 'Main task output/result text or summary' },
            artifacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Artifact type (e.g., "file", "url", "code", "report")' },
                  name: { type: 'string', description: 'Artifact name/identifier' },
                  content: { description: 'Artifact content or reference (string/object/binary)' },
                },
                required: ['type', 'name'],
              },
              description: 'Generated artifacts (files, code, reports, etc.)'
            },
            logs: { type: 'array', items: { type: 'string' }, description: 'Execution log messages (for debugging/audit)' },
            metrics: { type: 'object', description: 'Execution metrics (token counts, API calls, etc.)' },
          },
          description: 'Detailed task execution results including outputs, artifacts, logs, and metrics',
        },
        actual_cost_usd: { type: 'number', minimum: 0, description: 'Actual cost incurred in USD (for budget tracking)' },
        actual_duration_min: { type: 'number', minimum: 0, description: 'Actual execution duration in minutes (for performance analysis)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_ai_task',
    description: 'Mark an AI task as completed with final results. Convenience wrapper for update_ai_task that sets status=completed and attaches results. Use when task execution finished successfully. Provide output, artifacts, logs, and actual metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task UUID to complete' },
        output: { type: 'string', description: 'Final task output or result summary' },
        artifacts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Artifact type (e.g., "file", "url", "code")' },
              name: { type: 'string', description: 'Artifact name' },
              content: { description: 'Artifact content' },
            },
            required: ['type', 'name'],
          },
          description: 'Generated artifacts from task execution'
        },
        logs: { type: 'array', items: { type: 'string' }, description: 'Execution logs for audit trail' },
        metrics: { type: 'object', description: 'Execution metrics (tokens used, API calls, etc.)' },
        actual_cost_usd: { type: 'number', minimum: 0, description: 'Actual API/compute cost incurred' },
        actual_duration_min: { type: 'number', minimum: 0, description: 'Actual time spent in minutes' },
      },
      required: ['id'],
    },
  },
  {
    name: 'fail_ai_task',
    description: 'Mark an AI task as failed with error message. Convenience wrapper for update_ai_task that sets status=failed. Use when task cannot be completed due to errors, constraints, or invalid requirements. Provide clear error description for troubleshooting.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'AI task UUID to mark as failed' },
        error_message: { type: 'string', description: 'Detailed error description explaining why task failed (required)' },
      },
      required: ['id', 'error_message'],
    },
  },
  {
    name: 'get_ai_task_stats',
    description: 'Get aggregate statistics about AI tasks. Shows total counts by status, mode, agent, success/failure rates, average costs and durations. Use for monitoring AI agent performance, capacity planning, and cost tracking.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];
