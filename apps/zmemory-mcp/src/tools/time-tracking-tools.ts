import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const timeTrackingTools: Tool[] = [
  {
    name: 'get_day_time_spending',
    description: '获取指定日期的时间花费统计，包括总时间和按任务分解的时间',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: '要查询的日期，格式为 YYYY-MM-DD（如 "2023-08-27"）。可以是过去、今天或未来的日期。'
        },
        timezone: {
          type: 'string',
          description: '时区标识符（如 "America/New_York", "Asia/Shanghai", "Europe/London"）。如果不提供，将使用MCP服务器时区。时区决定了指定日期的具体时间范围（该时区的00:00:00到23:59:59）。'
        },
        user_id: { type: 'string', description: '用户ID (可选，默认为当前用户)' },
      },
      required: ['date'],
    },
  },
  {
    name: 'get_task_time_entries',
    description: '获取指定任务的时间记录',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '任务ID' },
        start_date: { type: 'string', description: '开始日期 (YYYY-MM-DD格式)' },
        end_date: { type: 'string', description: '结束日期 (YYYY-MM-DD格式)' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'start_task_timer',
    description: '开始任务计时',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '要开始计时的任务ID' },
        description: { type: 'string', description: '时间条目描述' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'stop_task_timer',
    description: '停止任务计时',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: '要停止计时的任务ID' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'get_running_timer',
    description: '获取当前正在运行的计时器',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];