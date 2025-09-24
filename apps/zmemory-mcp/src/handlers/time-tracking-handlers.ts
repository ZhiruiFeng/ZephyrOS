import { ZMemoryClient } from '../zmemory-client.js';
import {
  GetDayTimeEntriesParamsSchema,
  GetTaskTimeEntriesParamsSchema,
  StartTaskTimerParamsSchema,
  StopTaskTimerParamsSchema
} from '../types.js';

export class TimeTrackingHandlers {
  constructor(private zmemoryClient: ZMemoryClient) {}

  async handleGetDayTimeSpending(args: any) {
    const params = GetDayTimeEntriesParamsSchema.parse(args);
    const daySpending = await this.zmemoryClient.getDayTimeEntries(params);

    const totalHours = Math.floor(daySpending.total_time / 60);
    const totalMinutes = daySpending.total_time % 60;

    const taskBreakdown = daySpending.task_breakdown
      .map((task: any) => {
        const hours = Math.floor(task.total_time / 60);
        const minutes = task.total_time % 60;
        const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
        return `• ${task.task_title}: ${timeStr} (${task.entries.length}个时间段)`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `${params.date} 时间花费统计:

总时间: ${totalHours > 0 ? `${totalHours}小时${totalMinutes}分钟` : `${totalMinutes}分钟`}
时间条目数: ${daySpending.entries.length}

按任务分解:
${taskBreakdown || '  无时间记录'}`,
        },
      ],
    };
  }

  async handleGetTaskTimeEntries(args: any) {
    const params = GetTaskTimeEntriesParamsSchema.parse(args);
    const entries = await this.zmemoryClient.getTaskTimeEntries(params);

    if (entries.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '该任务没有时间记录',
          },
        ],
      };
    }

    const totalTime = entries.reduce((sum: number, entry: any) => sum + (entry.duration || 0), 0);
    const totalHours = Math.floor(totalTime / 60);
    const totalMinutes = totalTime % 60;

    const entriesList = entries
      .map((entry: any) => {
        const duration = entry.duration || 0;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
        const date = new Date(entry.start_time).toLocaleDateString();
        const description = entry.description ? ` - ${entry.description}` : '';
        return `• ${date}: ${timeStr}${description}`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `任务时间记录:

总时间: ${totalHours > 0 ? `${totalHours}小时${totalMinutes}分钟` : `${totalMinutes}分钟`}
记录数: ${entries.length}

时间记录:
${entriesList}`,
        },
      ],
    };
  }

  async handleStartTaskTimer(args: any) {
    const params = StartTaskTimerParamsSchema.parse(args);
    const entry = await this.zmemoryClient.startTaskTimer(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功开始任务计时:
任务ID: ${entry.task_id}
开始时间: ${new Date(entry.start_time).toLocaleString()}
${entry.description ? `描述: ${entry.description}` : ''}`,
        },
      ],
    };
  }

  async handleStopTaskTimer(args: any) {
    const params = StopTaskTimerParamsSchema.parse(args);
    const entry = await this.zmemoryClient.stopTaskTimer(params);

    const duration = entry.duration || 0;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;

    return {
      content: [
        {
          type: 'text',
          text: `成功停止任务计时:
任务ID: ${entry.task_id}
结束时间: ${entry.end_time ? new Date(entry.end_time).toLocaleString() : '未知'}
计时时长: ${timeStr}`,
        },
      ],
    };
  }

  async handleGetRunningTimer(args: any) {
    const timer = await this.zmemoryClient.getRunningTimer();

    if (!timer) {
      return {
        content: [
          {
            type: 'text',
            text: '当前没有运行中的计时器',
          },
        ],
      };
    }

    const startTime = new Date(timer.start_at);
    const now = new Date();
    const runningMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
    const hours = Math.floor(runningMinutes / 60);
    const minutes = runningMinutes % 60;
    const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;

    return {
      content: [
        {
          type: 'text',
          text: `当前运行的计时器:
任务ID: ${timer.task_id}
开始时间: ${startTime.toLocaleString()}
已运行时间: ${timeStr}
${timer.note ? `描述: ${timer.note}` : ''}`,
        },
      ],
    };
  }
}