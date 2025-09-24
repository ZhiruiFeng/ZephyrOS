import { ZMemoryClient } from '../zmemory-client.js';
import {
  CreateTaskParamsSchema,
  SearchTasksParamsSchema,
  UpdateTaskParamsSchema
} from '../types.js';

export class TaskHandlers {
  constructor(private zmemoryClient: ZMemoryClient) {}

  async handleCreateTask(args: any) {
    const params = CreateTaskParamsSchema.parse(args);
    const task = await this.zmemoryClient.createTask(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功创建任务: ${task.content?.title || task.id}`,
        },
        {
          type: 'text',
          text: `任务详情:
ID: ${task.id}
状态: ${task.content?.status || '未知'}
优先级: ${task.content?.priority || '未知'}
创建时间: ${task.created_at}`,
        },
      ],
    };
  }

  async handleSearchTasks(args: any) {
    const params = SearchTasksParamsSchema.parse(args);
    const tasks = await this.zmemoryClient.searchTasks(params);

    if (tasks.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '未找到匹配的任务',
          },
        ],
      };
    }

    const taskList = tasks
      .map((task: any) => {
        const title = task.content?.title || `未命名任务`;
        const status = task.content?.status ? ` (${task.content.status})` : '';
        const priority = task.content?.priority ? ` [${task.content.priority}]` : '';
        const dueDate = task.content?.due_date ? ` 截止: ${task.content.due_date}` : '';
        const progress = task.content?.progress !== undefined ? ` 进度: ${task.content.progress}%` : '';
        return `• ${title}${status}${priority}${dueDate}${progress} (ID: ${task.id})`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `找到 ${tasks.length} 个任务:\n\n${taskList}`,
        },
      ],
    };
  }

  async handleGetTask(args: any) {
    const { id } = args;
    if (!id) {
      throw new Error('需要提供任务ID');
    }

    const task = await this.zmemoryClient.getTask(id);
    const content = JSON.stringify(task.content, null, 2);
    const tags = task.tags?.join(', ') || '无';

    return {
      content: [
        {
          type: 'text',
          text: `任务详情:
ID: ${task.id}
类型: ${task.type}
标签: ${tags}
创建时间: ${task.created_at}
更新时间: ${task.updated_at}

内容:
${content}`,
        },
      ],
    };
  }

  async handleUpdateTask(args: any) {
    const params = UpdateTaskParamsSchema.parse(args);
    const task = await this.zmemoryClient.updateTask(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功更新任务: ${task.content?.title || task.id}`,
        },
        {
          type: 'text',
          text: `更新时间: ${task.updated_at}`,
        },
      ],
    };
  }

  async handleGetTaskStats(args: any) {
    const stats = await this.zmemoryClient.getTaskStats();

    const statusStats = Object.entries(stats.by_status || {})
      .map(([status, count]) => `  ${status}: ${count}`)
      .join('\n');

    const priorityStats = Object.entries(stats.by_priority || {})
      .map(([priority, count]) => `  ${priority}: ${count}`)
      .join('\n');

    const categoryStats = Object.entries(stats.by_category || {})
      .map(([category, count]) => `  ${category}: ${count}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `任务统计信息:

总任务数: ${stats.total || 0}
过期任务: ${stats.overdue || 0}
今日到期: ${stats.due_today || 0}
本周到期: ${stats.due_this_week || 0}
完成率: ${(stats.completion_rate || 0).toFixed(1)}%

按状态分布:
${statusStats || '  无数据'}

按优先级分布:
${priorityStats || '  无数据'}

按分类分布:
${categoryStats || '  无数据'}`,
        },
      ],
    };
  }

  async handleGetTaskUpdatesForToday(args: any) {
    const { timezone } = args;
    const result = await this.zmemoryClient.getTaskUpdatesForToday(timezone);

    if (result.tasks.length === 0) {
      const usedTimezone = timezone || 'MCP服务器时区';
      return {
        content: [
          {
            type: 'text',
            text: `今日无任务更新 (${usedTimezone})`,
          },
        ],
      };
    }

    const taskList = result.tasks
      .map((task: any) => {
        const title = task.content?.title || '未命名任务';
        const status = task.content?.status || '未知';
        const changeType = task.change_type || '更新';
        const time = new Date(task.timestamp).toLocaleTimeString();
        return `• ${title} - ${changeType} (${status}) 于 ${time}`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `今日任务更新 (${result.timezone}):

总更新数: ${result.tasks.length}

${taskList}`,
        },
      ],
    };
  }

  async handleGetTaskUpdatesForDate(args: any) {
    const { date, timezone } = args;

    if (!date) {
      throw new Error('需要提供日期参数 (YYYY-MM-DD 格式)');
    }

    const result = await this.zmemoryClient.getTaskUpdatesForDate(date, timezone);

    if (result.tasks.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `${date} 无任务更新 (${result.timezone})`,
          },
        ],
      };
    }

    const taskList = result.tasks
      .map((task: any) => {
        const title = task.content?.title || '未命名任务';
        const status = task.content?.status || '未知';
        const changeType = task.change_type || '更新';
        const time = new Date(task.timestamp).toLocaleTimeString();
        return `• ${title} - ${changeType} (${status}) 于 ${time}`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `${date} 任务更新 (${result.timezone}):

总更新数: ${result.tasks.length}

${taskList}`,
        },
      ],
    };
  }
}