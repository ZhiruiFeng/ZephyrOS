import { ZMemoryClient } from '../zmemory-client.js';
import {
  GetAITasksParamsSchema,
  GetAITaskParamsSchema,
  AcceptAITaskParamsSchema,
  UpdateAITaskParamsSchema
} from '../types.js';

export class AITasksHandlers {
  constructor(private zmemoryClient: ZMemoryClient) {}

  async handleGetAITasks(args: any) {
    const params = GetAITasksParamsSchema.parse(args);
    const tasks = await this.zmemoryClient.getAITasks(params);

    if (tasks.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No AI tasks found with the specified criteria',
          },
        ],
      };
    }

    const taskList = tasks
      .map((task: any) => {
        const objective = task.objective || 'No objective';
        const status = task.status || 'unknown';
        const agent = task.agent_name || 'unassigned';
        const mode = task.mode || 'plan_only';
        const taskType = task.task_type || 'general';
        const due = task.due_at ? ` (Due: ${new Date(task.due_at).toLocaleDateString()})` : '';
        return `• ${objective} - Agent: ${agent}, Status: ${status}, Mode: ${mode}, Type: ${taskType}${due} (ID: ${task.id})`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${tasks.length} AI tasks:\n\n${taskList}`,
        },
      ],
    };
  }

  async handleGetQueuedTasksForAgent(args: any) {
    const { agent_name } = args;
    if (!agent_name) {
      throw new Error('agent_name is required');
    }

    const tasks = await this.zmemoryClient.getQueuedTasksForAgent(agent_name);

    if (tasks.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No queued tasks for agent "${agent_name}"`,
          },
        ],
      };
    }

    const taskList = tasks
      .map((task: any) => {
        const objective = task.objective || 'No objective';
        const taskType = task.task_type || 'general';
        const mode = task.mode || 'plan_only';
        const priority = task.metadata?.priority || 'medium';
        const due = task.due_at ? ` (Due: ${new Date(task.due_at).toLocaleDateString()})` : '';
        return `• ${objective} - Type: ${taskType}, Mode: ${mode}, Priority: ${priority}${due} (ID: ${task.id})`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `${tasks.length} queued tasks for agent "${agent_name}":\n\n${taskList}\n\nUse "accept_ai_task" with the task ID to start working on a task.`,
        },
      ],
    };
  }

  async handleGetAITask(args: any) {
    const params = GetAITaskParamsSchema.parse(args);
    const task = await this.zmemoryClient.getAITask(params.id);

    const metadata = task.metadata ? `\nMetadata: ${JSON.stringify(task.metadata, null, 2)}` : '';
    const contextData = (task as any).context_data ? `\nContext: ${JSON.stringify((task as any).context_data, null, 2)}` : '';

    return {
      content: [
        {
          type: 'text',
          text: `AI Task Details:

ID: ${task.id}
Objective: ${task.objective || 'No objective'}
Status: ${task.status || 'unknown'}
Agent: ${task.agent_name || 'unassigned'}
Mode: ${task.mode || 'plan_only'}
Task Type: ${task.task_type || 'general'}
Priority: ${task.metadata?.priority || 'medium'}
${task.due_at ? `Due Date: ${new Date(task.due_at).toLocaleString()}` : ''}
${task.assigned_at ? `Assigned: ${new Date(task.assigned_at).toLocaleString()}` : ''}
${task.estimated_cost_usd ? `Estimated Cost: $${task.estimated_cost_usd}` : ''}
${task.estimated_duration_min ? `Estimated Duration: ${task.estimated_duration_min} minutes` : ''}
${task.actual_cost_usd ? `Actual Cost: $${task.actual_cost_usd}` : ''}
${task.actual_duration_min ? `Actual Duration: ${task.actual_duration_min} minutes` : ''}
Created: ${task.created_at}
Updated: ${task.updated_at}${metadata}${contextData}

${(task as any).description ? `Description:\n${(task as any).description}` : ''}
${(task as any).progress_message ? `\nProgress:\n${(task as any).progress_message}` : ''}
${(task as any).error_message ? `\nError:\n${(task as any).error_message}` : ''}`,
        },
      ],
    };
  }

  async handleAcceptAITask(args: any) {
    const params = AcceptAITaskParamsSchema.parse(args);
    const task = await this.zmemoryClient.acceptAITask(params);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully accepted AI task: ${task.objective}
Status: ${task.status}
${params.estimated_cost_usd ? `Estimated cost: $${params.estimated_cost_usd}` : ''}
${params.estimated_duration_min ? `Estimated duration: ${params.estimated_duration_min} minutes` : ''}

The task is now in progress. Use "update_ai_task" to report progress or "complete_ai_task" when finished.`,
        },
      ],
    };
  }

  async handleUpdateAITask(args: any) {
    const params = UpdateAITaskParamsSchema.parse(args);
    const task = await this.zmemoryClient.updateAITask(params);

    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated AI task: ${task.objective}
New status: ${task.status}
${params.progress_message ? `Progress: ${params.progress_message}` : ''}
${params.error_message ? `Error: ${params.error_message}` : ''}
Updated at: ${task.updated_at}`,
        },
      ],
    };
  }

  async handleCompleteAITask(args: any) {
    // Note: CompleteAITaskParamsSchema doesn't exist, so we'll validate manually
    const { id, output, artifacts, logs, metrics, actual_cost_usd, actual_duration_min } = args;
    if (!id) {
      throw new Error('AI task ID is required');
    }
    // TODO: Implement completeAITask in ZMemoryClient
    const task = await this.zmemoryClient.updateAITask({ ...args, status: 'completed' });

    return {
      content: [
        {
          type: 'text',
          text: `Successfully completed AI task: ${task.objective}
Status: ${task.status}
${actual_cost_usd ? `Final cost: $${actual_cost_usd}` : ''}
${actual_duration_min ? `Total duration: ${actual_duration_min} minutes` : ''}
${artifacts && artifacts.length > 0 ? `Artifacts generated: ${artifacts.length}` : ''}
Completed at: ${task.updated_at}

${output ? `Output:\n${output}` : ''}`,
        },
      ],
    };
  }

  async handleFailAITask(args: any) {
    // Note: FailAITaskParamsSchema doesn't exist, so we'll validate manually
    const { id, error_message } = args;
    if (!id || !error_message) {
      throw new Error('AI task ID and error message are required');
    }
    // TODO: Implement failAITask in ZMemoryClient
    const task = await this.zmemoryClient.updateAITask({ ...args, status: 'failed' });

    return {
      content: [
        {
          type: 'text',
          text: `AI task marked as failed: ${task.objective}
Status: ${task.status}
Error: ${error_message}
Failed at: ${task.updated_at}`,
        },
      ],
    };
  }

  async handleGetAITaskStats(args: any) {
    const stats = await this.zmemoryClient.getAITaskStats();

    const statusStats = Object.entries(stats.by_status || {})
      .map(([status, count]) => `  ${status}: ${count}`)
      .join('\n');

    const agentStats = Object.entries((stats as any).by_agent || {})
      .map(([agent, count]) => `  ${agent}: ${count}`)
      .join('\n');

    const modeStats = Object.entries(stats.by_mode || {})
      .map(([mode, count]) => `  ${mode}: ${count}`)
      .join('\n');

    const typeStats = Object.entries((stats as any).by_type || {})
      .map(([type, count]) => `  ${type}: ${count}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `AI Task Statistics:

Total Tasks: ${stats.total || 0}
Active Tasks: ${(stats as any).active || 0}
Completed Tasks: ${(stats as any).completed || 0}
Failed Tasks: ${(stats as any).failed || 0}

By Status:
${statusStats || '  No data'}

By Agent:
${agentStats || '  No data'}

By Mode:
${modeStats || '  No data'}

By Type:
${typeStats || '  No data'}

${(stats as any).avg_duration_min ? `Average Duration: ${(stats as any).avg_duration_min.toFixed(1)} minutes` : ''}
${(stats as any).avg_cost_usd ? `Average Cost: $${(stats as any).avg_cost_usd.toFixed(2)}` : ''}
${(stats as any).success_rate ? `Success Rate: ${((stats as any).success_rate * 100).toFixed(1)}%` : ''}`,
        },
      ],
    };
  }
}