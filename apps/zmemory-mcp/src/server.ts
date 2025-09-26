/**
 * ZMemory MCP Server - Modular Version
 *
 * 实现MCP协议的ZMemory服务器 - 模块化版本
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ZMemoryClient } from './zmemory-client.js';
import { ZMemoryConfig, ZMemoryError, OAuthError } from './types.js';

// Import all tools and handlers
import { allTools } from './tools/index.js';
import {
  AuthHandlers,
  TaskHandlers,
  MemoryHandlers,
  ActivityHandlers,
  TimelineHandlers,
  TimeTrackingHandlers,
  AITasksHandlers
} from './handlers/index.js';

export class ZMemoryMCPServer {
  private server: Server;
  private zmemoryClient: ZMemoryClient;

  // Handler instances
  private authHandlers: AuthHandlers;
  private taskHandlers: TaskHandlers;
  private memoryHandlers: MemoryHandlers;
  private activityHandlers: ActivityHandlers;
  private timelineHandlers: TimelineHandlers;
  private timeTrackingHandlers: TimeTrackingHandlers;
  private aiTasksHandlers: AITasksHandlers;

  constructor(config: ZMemoryConfig = { apiUrl: process.env.ZMEMORY_API_URL || 'http://localhost:3001' }) {
    this.server = new Server(
      {
        name: 'zmemory-mcp',
        version: '2.0.0', // Incremented for modular version
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.zmemoryClient = new ZMemoryClient(config);

    // Initialize all handler instances
    this.authHandlers = new AuthHandlers(this.zmemoryClient);
    this.taskHandlers = new TaskHandlers(this.zmemoryClient);
    this.memoryHandlers = new MemoryHandlers(this.zmemoryClient);
    this.activityHandlers = new ActivityHandlers(this.zmemoryClient);
    this.timelineHandlers = new TimelineHandlers(this.zmemoryClient);
    this.timeTrackingHandlers = new TimeTrackingHandlers(this.zmemoryClient);
    this.aiTasksHandlers = new AITasksHandlers(this.zmemoryClient);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: allTools,
    }));

    // Tool call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        return await this.handleToolCall(name, args);
      } catch (error) {
        if (error instanceof ZMemoryError || error instanceof OAuthError) {
          throw error;
        }

        console.error(`Error handling tool call ${name}:`, error);
        throw new Error(`处理工具调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
  }

  async handleToolCall(name: string, args: any) {
    switch (name) {
      // Authentication tools
      case 'authenticate':
        return await this.authHandlers.handleAuthenticate(args);
      case 'exchange_code_for_token':
        return await this.authHandlers.handleExchangeCodeForToken(args);
      case 'refresh_token':
        return await this.authHandlers.handleRefreshToken(args);
      case 'get_user_info':
        return await this.authHandlers.handleGetUserInfo(args);
      case 'set_access_token':
        return await this.authHandlers.handleSetAccessToken(args);
      case 'get_auth_status':
        return await this.authHandlers.handleGetAuthStatus(args);
      case 'clear_auth':
        return await this.authHandlers.handleClearAuth(args);
      case 'get_system_status':
        return await this.authHandlers.handleGetSystemStatus(args);

      // Memory management tools
      case 'add_memory':
        return await this.memoryHandlers.handleAddMemory(args);
      case 'search_memories':
        return await this.memoryHandlers.handleSearchMemories(args);
      case 'get_memory':
        return await this.memoryHandlers.handleGetMemory(args);
      case 'update_memory':
        return await this.memoryHandlers.handleUpdateMemory(args);
      case 'delete_memory':
        return await this.memoryHandlers.handleDeleteMemory(args);
      case 'get_memory_stats':
        return await this.memoryHandlers.handleGetMemoryStats(args);

      // Activity tracking tools
      case 'create_activity':
        return await this.activityHandlers.handleCreateActivity(args);
      case 'search_activities':
        return await this.activityHandlers.handleSearchActivities(args);
      case 'get_activity':
        return await this.activityHandlers.handleGetActivity(args);
      case 'update_activity':
        return await this.activityHandlers.handleUpdateActivity(args);
      case 'get_activity_stats':
        return await this.activityHandlers.handleGetActivityStats(args);

      // Timeline system tools
      case 'get_timeline_items':
        return await this.timelineHandlers.handleGetTimelineItems(args);
      case 'create_timeline_item':
        return await this.timelineHandlers.handleCreateTimelineItem(args);
      case 'get_timeline_insights':
        return await this.timelineHandlers.handleGetTimelineInsights(args);
      case 'search_across_timeline':
        return await this.timelineHandlers.handleSearchAcrossTimeline(args);

      // Task management tools
      case 'create_task':
        return await this.taskHandlers.handleCreateTask(args);
      case 'search_tasks':
        return await this.taskHandlers.handleSearchTasks(args);
      case 'get_task':
        return await this.taskHandlers.handleGetTask(args);
      case 'update_task':
        return await this.taskHandlers.handleUpdateTask(args);
      case 'get_task_stats':
        return await this.taskHandlers.handleGetTaskStats(args);
      case 'get_task_updates_for_today':
        return await this.taskHandlers.handleGetTaskUpdatesForToday(args);
      case 'get_task_updates_for_date':
        return await this.taskHandlers.handleGetTaskUpdatesForDate(args);

      // Time tracking tools
      case 'get_day_time_spending':
        return await this.timeTrackingHandlers.handleGetDayTimeSpending(args);
      case 'get_task_time_entries':
        return await this.timeTrackingHandlers.handleGetTaskTimeEntries(args);
      case 'start_task_timer':
        return await this.timeTrackingHandlers.handleStartTaskTimer(args);
      case 'stop_task_timer':
        return await this.timeTrackingHandlers.handleStopTaskTimer(args);
      case 'get_running_timer':
        return await this.timeTrackingHandlers.handleGetRunningTimer(args);

      // Category management tools (these might need separate handlers if they exist)
      case 'get_categories':
        return await this.handleGetCategories(args);
      case 'create_category':
        return await this.handleCreateCategory(args);
      case 'get_category':
        return await this.handleGetCategory(args);
      case 'update_category':
        return await this.handleUpdateCategory(args);

      // AI tasks tools
      case 'get_ai_tasks':
        return await this.aiTasksHandlers.handleGetAITasks(args);
      case 'get_queued_tasks_for_agent':
        return await this.aiTasksHandlers.handleGetQueuedTasksForAgent(args);
      case 'get_ai_task':
        return await this.aiTasksHandlers.handleGetAITask(args);
      case 'accept_ai_task':
        return await this.aiTasksHandlers.handleAcceptAITask(args);
      case 'update_ai_task':
        return await this.aiTasksHandlers.handleUpdateAITask(args);
      case 'complete_ai_task':
        return await this.aiTasksHandlers.handleCompleteAITask(args);
      case 'fail_ai_task':
        return await this.aiTasksHandlers.handleFailAITask(args);
      case 'get_ai_task_stats':
        return await this.aiTasksHandlers.handleGetAITaskStats(args);

      default:
        throw new Error(`未知的工具调用: ${name}`);
    }
  }

  // Category handlers (temporary - these should be moved to their own handlers)
  private async handleGetCategories(args: any) {
    const categories = await this.zmemoryClient.getCategories();

    return {
      content: [
        {
          type: 'text',
          text: `可用分类 (${categories.length}个):

${categories.map((cat: any) => `• ${cat.name} (ID: ${cat.id})`).join('\n')}

在创建任务时可以直接使用分类名称，系统会自动映射到对应的ID。`,
        },
      ],
    };
  }

  private async handleCreateCategory(args: any) {
    const { name, ...params } = args;
    if (!name) {
      throw new Error('分类名称不能为空');
    }

    const category = await this.zmemoryClient.createCategory({ name, ...params });

    return {
      content: [
        {
          type: 'text',
          text: `成功创建分类: ${category.name} (ID: ${category.id})`,
        },
      ],
    };
  }

  private async handleGetCategory(args: any) {
    const { id } = args;
    if (!id) {
      throw new Error('需要提供分类ID');
    }

    const category = await this.zmemoryClient.getCategory(id);

    return {
      content: [
        {
          type: 'text',
          text: `分类详情:
ID: ${category.id}
名称: ${category.name}
描述: ${category.description || '无'}
颜色: ${category.color || '默认'}
创建时间: ${category.created_at}
更新时间: ${category.updated_at}`,
        },
      ],
    };
  }

  private async handleUpdateCategory(args: any) {
    const { id, ...updateData } = args;
    if (!id) {
      throw new Error('需要提供分类ID');
    }

    const category = await this.zmemoryClient.updateCategory(id, updateData);

    return {
      content: [
        {
          type: 'text',
          text: `成功更新分类: ${category.name}`,
        },
        {
          type: 'text',
          text: `更新时间: ${category.updated_at}`,
        },
      ],
    };
  }

  async run() {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ZMemory MCP服务器已启动');
  }

  getServer() {
    return this.server;
  }

  async close() {
    await this.server.close();
  }
}

// Export server creation function
export function createZMemoryMCPServer(config?: ZMemoryConfig): ZMemoryMCPServer {
  return new ZMemoryMCPServer(config);
}