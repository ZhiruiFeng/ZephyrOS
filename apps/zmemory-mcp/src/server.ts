/**
 * ZMemory MCP Server
 * 
 * 实现MCP协议的ZMemory服务器
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ZMemoryClient } from './zmemory-client.js';
import {
  ZMemoryConfig,
  // AddMemoryParamsSchema, // DISABLED - Memory API not available
  // SearchMemoriesParamsSchema, // DISABLED - Memory API not available
  // UpdateMemoryParamsSchema, // DISABLED - Memory API not available
  // GetMemoryParamsSchema, // DISABLED - Memory API not available
  // DeleteMemoryParamsSchema, // DISABLED - Memory API not available
  AuthenticateParamsSchema,
  RefreshTokenParamsSchema,
  CreateTaskParamsSchema,
  SearchTasksParamsSchema,
  UpdateTaskParamsSchema,
  GetDayTimeEntriesParamsSchema,
  GetTaskTimeEntriesParamsSchema,
  StartTaskTimerParamsSchema,
  StopTaskTimerParamsSchema,
  GetCategoriesParamsSchema,
  CreateCategoryParamsSchema,
  ZMemoryError,
  OAuthError,
} from './types.js';

export class ZMemoryMCPServer {
  private server: Server;
  private zmemoryClient: ZMemoryClient;

  constructor(config: ZMemoryConfig) {
    this.server = new Server(
      {
        name: 'zmemory-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.zmemoryClient = new ZMemoryClient(config);
    this.setupHandlers();
  }

  private setupHandlers() {
    // 工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    // 工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // OAuth 认证相关工具
          case 'authenticate':
            return await this.handleAuthenticate(args);
          case 'exchange_code_for_token':
            return await this.handleExchangeCodeForToken(args);
          case 'refresh_token':
            return await this.handleRefreshToken(args);
          case 'get_user_info':
            return await this.handleGetUserInfo(args);
          case 'set_access_token':
            return await this.handleSetAccessToken(args);
          case 'get_auth_status':
            return await this.handleGetAuthStatus(args);
          case 'clear_auth':
            return await this.handleClearAuth(args);
          
          // 记忆管理工具 - DISABLED (API not available)
          // case 'add_memory':
          //   return await this.handleAddMemory(args);
          // case 'search_memories':
          //   return await this.handleSearchMemories(args);
          // case 'get_memory':
          //   return await this.handleGetMemory(args);
          // case 'update_memory':
          //   return await this.handleUpdateMemory(args);
          // case 'get_memory_stats':
          //   return await this.handleGetMemoryStats(args);
          
          // Task management tools
          case 'create_task':
            return await this.handleCreateTask(args);
          case 'search_tasks':
            return await this.handleSearchTasks(args);
          case 'get_task':
            return await this.handleGetTask(args);
          case 'update_task':
            return await this.handleUpdateTask(args);
          case 'get_task_stats':
            return await this.handleGetTaskStats(args);
          case 'get_task_updates_for_today':
            return await this.handleGetTaskUpdatesForToday(args);
          case 'get_task_updates_for_date':
            return await this.handleGetTaskUpdatesForDate(args);
          
          // Time tracking tools
          case 'get_day_time_spending':
            return await this.handleGetDayTimeSpending(args);
          case 'get_task_time_entries':
            return await this.handleGetTaskTimeEntries(args);
          case 'start_task_timer':
            return await this.handleStartTaskTimer(args);
          case 'stop_task_timer':
            return await this.handleStopTaskTimer(args);
          case 'get_running_timer':
            return await this.handleGetRunningTimer(args);
          
          // Category management tools
          case 'get_categories':
            return await this.handleGetCategories(args);
          case 'create_category':
            return await this.handleCreateCategory(args);
          case 'get_category':
            return await this.handleGetCategory(args);
          case 'update_category':
            return await this.handleUpdateCategory(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        let errorMessage = 'Unknown error';
        let isOAuthError = false;

        if (error instanceof OAuthError) {
          errorMessage = `OAuth错误: ${error.message}`;
          isOAuthError = true;
        } else if (error instanceof ZMemoryError) {
          errorMessage = `ZMemory错误: ${error.message}`;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        return {
          content: [
            {
              type: 'text',
              text: `错误: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      // OAuth 认证工具
      {
        name: 'authenticate',
        description: '启动OAuth认证流程，获取认证URL',
        inputSchema: {
          type: 'object',
          properties: {
            client_id: { type: 'string', description: 'OAuth客户端ID' },
            redirect_uri: { type: 'string', description: '重定向URI' },
            scope: { type: 'string', description: '请求的权限范围' },
            state: { type: 'string', description: '状态参数' },
          },
          required: ['client_id'],
        },
      },
      {
        name: 'exchange_code_for_token',
        description: '使用授权码交换访问令牌',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: '授权码' },
            redirect_uri: { type: 'string', description: '重定向URI' },
            code_verifier: { type: 'string', description: 'PKCE验证码' },
          },
          required: ['code', 'redirect_uri'],
        },
      },
      {
        name: 'refresh_token',
        description: '刷新访问令牌',
        inputSchema: {
          type: 'object',
          properties: {
            refresh_token: { type: 'string', description: '刷新令牌' },
          },
          required: ['refresh_token'],
        },
      },
      {
        name: 'get_user_info',
        description: '获取当前用户信息',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'set_access_token',
        description: '手动设置访问令牌（用于测试或直接使用令牌）',
        inputSchema: {
          type: 'object',
          properties: {
            access_token: { type: 'string', description: '访问令牌' },
          },
          required: ['access_token'],
        },
      },
      {
        name: 'get_auth_status',
        description: '获取当前认证状态',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'clear_auth',
        description: '清除认证状态',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      
      // 记忆管理工具 - DISABLED (API not available)
      /*
      {
        name: 'add_memory',
        description: '添加新的记忆或任务到ZMemory系统',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: '记忆类型，如 task, note, bookmark 等' },
            content: {
              type: 'object',
              properties: {
                title: { type: 'string', description: '标题' },
                description: { type: 'string', description: '详细描述' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: '状态' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: '优先级' },
                category: { type: 'string', description: '分类' },
              },
              required: ['title'],
              description: '记忆内容',
            },
            tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
            metadata: { type: 'object', description: '额外元数据' },
          },
          required: ['type', 'content'],
        },
      },
      {
        name: 'search_memories',
        description: '搜索和筛选ZMemory中的记忆',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: '按类型筛选' },
            status: { type: 'string', description: '按状态筛选' },
            priority: { type: 'string', description: '按优先级筛选' },
            category: { type: 'string', description: '按分类筛选' },
            tags: { type: 'array', items: { type: 'string' }, description: '按标签筛选' },
            keyword: { type: 'string', description: '关键词搜索' },
            limit: { type: 'number', description: '返回数量限制' },
            offset: { type: 'number', description: '分页偏移' },
          },
          required: [],
        },
      },
      {
        name: 'get_memory',
        description: '根据ID获取特定的记忆详情',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '记忆ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_memory',
        description: '更新现有记忆的内容',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '记忆ID' },
            content: { type: 'object', description: '要更新的内容' },
            tags: { type: 'array', items: { type: 'string' }, description: '要更新的标签' },
            metadata: { type: 'object', description: '要更新的元数据' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_memory_stats',
        description: '获取记忆统计信息，包括总数、类型分布、状态分布等',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      */

      // Task management tools
      {
        name: 'create_task',
        description: '创建新任务。只需要提供任务标题即可创建，建议提供描述以获得更好的任务管理体验。默认状态为pending（与数据库默认值一致）。对于分类，可以传入分类名称（如"工作"、"个人"、"学习"等），系统会自动查找对应的category_id。支持设置优先级、截止日期、预计耗时等详细信息。',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '任务标题（必需）' },
            description: { type: 'string', description: '任务描述（可选，但建议提供以获得更好的任务管理体验）' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: '任务状态，默认为pending（与数据库默认值一致）' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: '任务优先级，默认为medium（与数据库默认值一致）' },
            category: { type: 'string', description: '任务分类名称（如"工作"、"个人"、"学习"等，系统会自动查找对应的category_id）' },
            due_date: { type: 'string', description: '截止日期 (YYYY-MM-DD 或 ISO 8601格式)' },
            timezone: { type: 'string', description: '时区标识符，用于解释due_date。如 "America/New_York" 或 "Asia/Shanghai"' },
            estimated_duration: { type: 'number', description: '预计耗时(分钟)' },
            assignee: { type: 'string', description: '任务负责人' },
            tags: { type: 'array', items: { type: 'string' }, description: '任务标签' },
            notes: { type: 'string', description: '任务备注' },
          },
          required: ['title'],
        },
      },
      {
        name: 'search_tasks',
        description: '搜索和筛选任务，支持按状态、优先级、分类、日期范围等筛选',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: '按状态筛选' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: '按优先级筛选' },
            category: { type: 'string', description: '按分类筛选' },
            assignee: { type: 'string', description: '按负责人筛选' },
            keyword: { type: 'string', description: '在标题和描述中搜索关键词' },
            tags: { type: 'array', items: { type: 'string' }, description: '按标签筛选' },
            due_after: { type: 'string', description: '截止日期在此日期之后 (YYYY-MM-DD格式)' },
            due_before: { type: 'string', description: '截止日期在此日期之前 (YYYY-MM-DD格式)' },
            created_after: { type: 'string', description: '创建日期在此日期之后 (YYYY-MM-DD格式)' },
            created_before: { type: 'string', description: '创建日期在此日期之前 (YYYY-MM-DD格式)' },
            updated_today: { type: 'boolean', description: '只显示今天更新的任务' },
            overdue: { type: 'boolean', description: '只显示过期任务' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: '返回数量限制' },
            offset: { type: 'number', minimum: 0, default: 0, description: '分页偏移' },
            sort_by: { type: 'string', enum: ['created_at', 'updated_at', 'due_date', 'priority', 'title'], default: 'created_at', description: '排序字段' },
            sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc', description: '排序方向' },
          },
          required: [],
        },
      },
      {
        name: 'get_task',
        description: '根据ID获取特定任务的详细信息',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '任务ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_task',
        description: '更新任务信息，可以修改标题、状态、优先级、进度等',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '任务ID' },
            title: { type: 'string', description: '任务标题' },
            description: { type: 'string', description: '任务描述' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'], description: '任务状态' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: '任务优先级' },
            category: { type: 'string', description: '任务分类' },
            due_date: { type: 'string', description: '截止日期 (YYYY-MM-DD格式)' },
            estimated_duration: { type: 'number', description: '预计耗时(分钟)' },
            progress: { type: 'number', minimum: 0, maximum: 100, description: '完成进度(0-100)' },
            assignee: { type: 'string', description: '任务负责人' },
            tags: { type: 'array', items: { type: 'string' }, description: '任务标签' },
            notes: { type: 'string', description: '任务备注' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_task_stats',
        description: '获取任务统计信息，包括总数、状态分布、优先级分布、过期任务数等',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_task_updates_for_today',
        description: '获取今天更新的任务列表。这个工具专门用于查看当前日期内所有有更新记录的任务，帮助用户快速了解今天的工作进展和任务状态变化。支持自动时区检测，如果不提供时区参数，将使用MCP服务器所在时区作为"今天"的定义。\n\n使用场景：\n• 日常工作总结：查看今天完成了哪些任务\n• 进度跟踪：了解今天任务状态的变化\n• 工作汇报：快速获取今日工作成果\n• 习惯养成：每日查看工作进展，培养总结习惯',
        inputSchema: {
          type: 'object',
          properties: {
            timezone: { 
              type: 'string', 
              description: '时区标识符（如 "America/New_York", "Asia/Shanghai", "Europe/London"）。如果不提供，将自动使用MCP服务器时区。建议Claude用户明确指定所在时区以确保获取准确的"今天"范围。' 
            },
          },
          required: [],
        },
      },
      {
        name: 'get_task_updates_for_date',
        description: '获取指定日期更新的任务列表。这个工具允许用户查看历史某一天或未来某一天的任务更新情况，非常适合回顾过去的工作或规划未来的任务。结合时区参数，可以准确获取指定时区下某一天（00:00到23:59）的所有任务更新记录。\n\n使用场景：\n• 工作回顾：查看过去某天的工作完成情况\n• 绩效分析：统计特定日期的任务处理数量和类型\n• 项目复盘：回看项目关键节点的任务状态变化\n• 跨时区协作：查看不同时区同事在其本地时间某天的工作进展\n• 补录工作：查看遗漏记录的某天任务状态',
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
          },
          required: ['date'],
        },
      },

      // Time tracking tools
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

      // Category management tools
      {
        name: 'get_categories',
        description: '获取所有可用的任务分类列表。在创建任务时，可以使用这些分类名称来设置任务的分类。系统会自动将分类名称映射到对应的category_id。',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'create_category',
        description: '创建新的任务分类',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 50, description: '分类名称' },
            description: { type: 'string', description: '分类描述' },
            color: { type: 'string', pattern: '^#[0-9A-F]{6}$', description: '分类颜色 (十六进制格式)', default: '#6B7280' },
            icon: { type: 'string', description: '分类图标' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_category',
        description: '根据ID获取特定分类信息',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '分类ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_category',
        description: '更新分类信息',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '分类ID' },
            name: { type: 'string', minLength: 1, maxLength: 50, description: '分类名称' },
            description: { type: 'string', description: '分类描述' },
            color: { type: 'string', pattern: '^#[0-9A-F]{6}$', description: '分类颜色 (十六进制格式)' },
            icon: { type: 'string', description: '分类图标' },
          },
          required: ['id'],
        },
      },
    ];
  }

  // OAuth 认证处理器
  private async handleAuthenticate(args: any) {
    const params = AuthenticateParamsSchema.parse(args);
    const result = await this.zmemoryClient.authenticate(params);

    return {
      content: [
        {
          type: 'text',
          text: `请访问以下URL进行认证:\n${result.authUrl}\n\n认证完成后，请使用返回的授权码调用 exchange_code_for_token 工具。`,
        },
      ],
    };
  }

  private async handleExchangeCodeForToken(args: any) {
    const { code, redirect_uri, code_verifier } = args;
    if (!code || !redirect_uri) {
      throw new Error('需要提供 code 和 redirect_uri 参数');
    }

    const tokens = await this.zmemoryClient.exchangeCodeForToken(code, redirect_uri, code_verifier);

    return {
      content: [
        {
          type: 'text',
          text: `认证成功！\n访问令牌已保存。\n令牌类型: ${tokens.token_type}\n过期时间: ${tokens.expires_in}秒`,
        },
      ],
    };
  }

  private async handleRefreshToken(args: any) {
    const { refresh_token } = args;
    if (!refresh_token) {
      throw new Error('需要提供 refresh_token 参数');
    }

    const tokens = await this.zmemoryClient.refreshToken(refresh_token);

    return {
      content: [
        {
          type: 'text',
          text: `令牌刷新成功！\n新的访问令牌已保存。\n过期时间: ${tokens.expires_in}秒`,
        },
      ],
    };
  }

  private async handleGetUserInfo(args: any) {
    const userInfo = await this.zmemoryClient.getUserInfo();

    return {
      content: [
        {
          type: 'text',
          text: `用户信息:\n用户ID: ${userInfo.sub}\n邮箱: ${userInfo.email}\n姓名: ${userInfo.name || '未设置'}`,
        },
      ],
    };
  }

  private async handleSetAccessToken(args: any) {
    const { access_token } = args;
    if (!access_token) {
      throw new Error('需要提供 access_token 参数');
    }

    this.zmemoryClient.setAccessToken(access_token);

    return {
      content: [
        {
          type: 'text',
          text: '访问令牌已设置。现在可以使用记忆管理功能了。',
        },
      ],
    };
  }

  private async handleGetAuthStatus(args: any) {
    const authState = this.zmemoryClient.getAuthState();

    if (!authState.isAuthenticated) {
      return {
        content: [
          {
            type: 'text',
            text: '当前未认证。请先进行OAuth认证。',
          },
        ],
      };
    }

    const statusText = `认证状态: 已认证\n用户: ${authState.userInfo?.email || '未知'}\n令牌过期时间: ${authState.expiresAt ? new Date(authState.expiresAt).toLocaleString() : '未知'}`;

    return {
      content: [
        {
          type: 'text',
          text: statusText,
        },
      ],
    };
  }

  private async handleClearAuth(args: any) {
    this.zmemoryClient.clearAuth();

    return {
      content: [
        {
          type: 'text',
          text: '认证状态已清除。',
        },
      ],
    };
  }

  // Memory management handlers - DISABLED (API not available)
  /*
  private async handleAddMemory(args: any) {
    const params = AddMemoryParamsSchema.parse(args);
    const memory = await this.zmemoryClient.addMemory(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功添加记忆: ${memory.content?.title || memory.id}`,
        },
        {
          type: 'text',
          text: `记忆详情:\nID: ${memory.id}\n类型: ${memory.type}\n创建时间: ${memory.created_at}`,
        },
      ],
    };
  }

  private async handleSearchMemories(args: any) {
    const params = SearchMemoriesParamsSchema.parse(args);
    const memories = await this.zmemoryClient.searchMemories(params);

    if (memories.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '未找到匹配的记忆',
          },
        ],
      };
    }

    const memoryList = memories
      .map(memory => {
        const title = memory.content?.title || `未命名${memory.type}`;
        const status = memory.content?.status ? ` (${memory.content.status})` : '';
        const priority = memory.content?.priority ? ` [${memory.content.priority}]` : '';
        return `• ${title}${status}${priority} (ID: ${memory.id})`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `找到 ${memories.length} 条记忆:\n\n${memoryList}`,
        },
      ],
    };
  }

  private async handleGetMemory(args: any) {
    const params = GetMemoryParamsSchema.parse(args);
    const memory = await this.zmemoryClient.getMemory(params.id);

    const content = JSON.stringify(memory.content, null, 2);
    const tags = memory.tags?.join(', ') || '无';

    return {
      content: [
        {
          type: 'text',
          text: `记忆详情:
ID: ${memory.id}
类型: ${memory.type}
标签: ${tags}
创建时间: ${memory.created_at}
更新时间: ${memory.updated_at}

内容:
${content}`,
        },
      ],
    };
  }

  private async handleUpdateMemory(args: any) {
    const params = UpdateMemoryParamsSchema.parse(args);
    const memory = await this.zmemoryClient.updateMemory(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功更新记忆: ${memory.content?.title || memory.id}`,
        },
        {
          type: 'text',
          text: `更新时间: ${memory.updated_at}`,
        },
      ],
    };
  }

  private async handleGetMemoryStats(args: any) {
    const stats = await this.zmemoryClient.getStats();

    const typeStats = Object.entries(stats.by_type)
      .map(([type, count]) => `  ${type}: ${count}`)
      .join('\n');

    const statusStats = Object.entries(stats.by_status)
      .map(([status, count]) => `  ${status}: ${count}`)
      .join('\n');

    const priorityStats = Object.entries(stats.by_priority)
      .map(([priority, count]) => `  ${priority}: ${count}`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `记忆统计信息:

总记忆数: ${stats.total}
最近24小时新增: ${stats.recent_count}

按类型分布:
${typeStats}

按状态分布:
${statusStats}

按优先级分布:
${priorityStats}`,
        },
      ],
    };
  }
  */

  // Task management handlers
  private async handleCreateTask(args: any) {
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

  private async handleSearchTasks(args: any) {
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

  private async handleGetTask(args: any) {
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

  private async handleUpdateTask(args: any) {
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

  private async handleGetTaskStats(args: any) {
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

  private async handleGetTaskUpdatesForToday(args: any) {
    const { timezone } = args;
    const result = await this.zmemoryClient.getTaskUpdatesForToday(timezone);

    if (result.tasks.length === 0) {
      const usedTimezone = timezone || 'MCP服务器时区';
      return {
        content: [
          {
            type: 'text',
            text: `今天没有更新的任务 (使用时区: ${usedTimezone})\n时间范围: ${result.date_range.start} 至 ${result.date_range.end}`,
          },
        ],
      };
    }

    const taskList = result.tasks
      .map((task: any) => {
        const title = task.content?.title || `未命名任务`;
        const status = task.content?.status ? ` (${task.content.status})` : '';
        const priority = task.content?.priority ? ` [${task.content.priority}]` : '';
        const progress = task.content?.progress !== undefined ? ` 进度: ${task.content.progress}%` : '';
        const category = task.content?.category ? ` 分类: ${task.content.category}` : '';
        return `• ${title}${status}${priority}${progress}${category} - 更新于 ${new Date(task.updated_at).toLocaleString()}`;
      })
      .join('\n');

    const usedTimezone = timezone || 'MCP服务器时区';
    return {
      content: [
        {
          type: 'text',
          text: `今天更新的 ${result.tasks.length} 个任务 (总共 ${result.total} 个，使用时区: ${usedTimezone}):
          
时间范围: ${result.date_range.start} 至 ${result.date_range.end}

${taskList}`,
        },
      ],
    };
  }

  private async handleGetTaskUpdatesForDate(args: any) {
    const { date, timezone } = args;
    
    if (!date) {
      throw new Error('日期参数是必需的，格式为 YYYY-MM-DD');
    }

    // 验证日期格式
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('日期格式无效，请使用 YYYY-MM-DD 格式（如 "2023-08-27"）');
    }

    const result = await this.zmemoryClient.getTaskUpdatesForDate(date, timezone);

    if (result.tasks.length === 0) {
      const usedTimezone = timezone || 'MCP服务器时区';
      return {
        content: [
          {
            type: 'text',
            text: `${date} 没有更新的任务 (使用时区: ${usedTimezone})\n时间范围: ${result.date_range.start} 至 ${result.date_range.end}`,
          },
        ],
      };
    }

    const taskList = result.tasks
      .map((task: any) => {
        const title = task.content?.title || `未命名任务`;
        const status = task.content?.status ? ` (${task.content.status})` : '';
        const priority = task.content?.priority ? ` [${task.content.priority}]` : '';
        const progress = task.content?.progress !== undefined ? ` 进度: ${task.content.progress}%` : '';
        const category = task.content?.category ? ` 分类: ${task.content.category}` : '';
        return `• ${title}${status}${priority}${progress}${category} - 更新于 ${new Date(task.updated_at).toLocaleString()}`;
      })
      .join('\n');

    const usedTimezone = timezone || 'MCP服务器时区';
    const dateDisplay = date === new Date().toISOString().split('T')[0] ? `${date} (今天)` : date;
    
    return {
      content: [
        {
          type: 'text',
          text: `${dateDisplay} 更新的 ${result.tasks.length} 个任务 (总共 ${result.total} 个，使用时区: ${usedTimezone}):
          
时间范围: ${result.date_range.start} 至 ${result.date_range.end}

${taskList}`,
        },
      ],
    };
  }

  // Time tracking handlers
  private async handleGetDayTimeSpending(args: any) {
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

  private async handleGetTaskTimeEntries(args: any) {
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

  private async handleStartTaskTimer(args: any) {
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

  private async handleStopTaskTimer(args: any) {
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

  private async handleGetRunningTimer(args: any) {
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

  // Category management handlers
  private async handleGetCategories(args: any) {
    const params = GetCategoriesParamsSchema.parse(args);
    const categories = await this.zmemoryClient.getCategories(params);

    if (categories.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '暂无分类',
          },
        ],
      };
    }

    const categoryList = categories
      .map((category: any) => {
        const color = category.color || '#6B7280';
        const icon = category.icon ? `${category.icon} ` : '';
        const description = category.description ? ` - ${category.description}` : '';
        return `• ${icon}${category.name} (${color})${description} (ID: ${category.id})`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `分类列表 (共 ${categories.length} 个):\n\n${categoryList}`,
        },
      ],
    };
  }

  private async handleCreateCategory(args: any) {
    const params = CreateCategoryParamsSchema.parse(args);
    const category = await this.zmemoryClient.createCategory(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功创建分类: ${category.name}`,
        },
        {
          type: 'text',
          text: `分类详情:
ID: ${category.id}
名称: ${category.name}
颜色: ${category.color}
${category.description ? `描述: ${category.description}` : ''}
${category.icon ? `图标: ${category.icon}` : ''}`,
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
颜色: ${category.color}
${category.description ? `描述: ${category.description}` : ''}
${category.icon ? `图标: ${category.icon}` : ''}
创建时间: ${category.created_at}
更新时间: ${category.updated_at}`,
        },
      ],
    };
  }

  private async handleUpdateCategory(args: any) {
    const { id, ...updates } = args;
    if (!id) {
      throw new Error('需要提供分类ID');
    }

    const category = await this.zmemoryClient.updateCategory(id, updates);

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
    // 启动前检查连接
    const isHealthy = await this.zmemoryClient.healthCheck();
    if (!isHealthy) {
      console.warn('警告: 无法连接到ZMemory API，某些功能可能不可用');
    }

    // 使用stdio transport进行MCP通信
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ZMemory MCP服务器已启动');
    return transport;
  }

  getServer() {
    return this.server;
  }

  // HTTP API 处理方法
  async handleInitialize(params: any = {}) {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
      },
      serverInfo: {
        name: 'zmemory-mcp',
        version: '1.0.0',
      },
    };
  }

  async handleListTools() {
    const tools: Tool[] = [
      // OAuth 认证工具
      {
        name: 'authenticate',
        description: '启动 OAuth 认证流程，获取授权URL',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'exchange_code_for_token',
        description: '使用授权码交换访问令牌',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: '授权码' },
            state: { type: 'string', description: '状态参数（可选）' },
          },
          required: ['code'],
        },
      },
      {
        name: 'refresh_token',
        description: '刷新访问令牌',
        inputSchema: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string', description: '刷新令牌' },
          },
          required: ['refreshToken'],
        },
      },
      {
        name: 'get_user_info',
        description: '获取当前用户信息',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'set_access_token',
        description: '手动设置访问令牌',
        inputSchema: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: '访问令牌' },
          },
          required: ['accessToken'],
        },
      },
      {
        name: 'get_auth_status',
        description: '获取当前认证状态',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'clear_auth',
        description: '清除认证状态',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },

      // 任务管理工具
      {
        name: 'create_task',
        description: '创建新任务',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '任务标题' },
            description: { type: 'string', description: '任务描述（可选）' },
            category: { type: 'string', description: '任务分类（可选）' },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              description: '任务优先级' 
            },
            due_date: { type: 'string', description: '截止日期 (YYYY-MM-DD)（可选）' },
            tags: { 
              type: 'array', 
              items: { type: 'string' },
              description: '任务标签（可选）' 
            },
          },
          required: ['title'],
        },
      },
      {
        name: 'search_tasks',
        description: '搜索和筛选任务',
        inputSchema: {
          type: 'object',
          properties: {
            status: { 
              type: 'string', 
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              description: '任务状态' 
            },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              description: '任务优先级' 
            },
            category: { type: 'string', description: '任务分类' },
            keyword: { type: 'string', description: '关键词搜索' },
            limit: { type: 'number', description: '返回结果数量限制' },
            offset: { type: 'number', description: '分页偏移量' },
          },
          required: [],
        },
      },
      {
        name: 'update_task',
        description: '更新现有任务',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '任务ID' },
            title: { type: 'string', description: '任务标题' },
            description: { type: 'string', description: '任务描述' },
            status: { 
              type: 'string', 
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              description: '任务状态' 
            },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              description: '任务优先级' 
            },
            category: { type: 'string', description: '任务分类' },
            due_date: { type: 'string', description: '截止日期 (YYYY-MM-DD)' },
            tags: { 
              type: 'array', 
              items: { type: 'string' },
              description: '任务标签' 
            },
          },
          required: ['id'],
        },
      },

      // 时间追踪工具
      {
        name: 'start_task_timer',
        description: '开始任务计时',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: '任务ID' },
            description: { type: 'string', description: '时间条目描述（可选）' },
          },
          required: ['taskId'],
        },
      },
      {
        name: 'stop_task_timer',
        description: '停止任务计时',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: '任务ID' },
          },
          required: ['taskId'],
        },
      },

      // 分类管理工具
      {
        name: 'get_categories',
        description: '获取所有分类',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'create_category',
        description: '创建新分类',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '分类名称' },
            color: { type: 'string', description: '分类颜色（可选）' },
            description: { type: 'string', description: '分类描述（可选）' },
          },
          required: ['name'],
        },
      },
    ];

    return { tools };
  }

  async handleToolCall(name: string, args: any) {
    try {
      switch (name) {
        // OAuth 认证工具
        case 'authenticate':
          return await this.handleAuthenticate(args);
        case 'exchange_code_for_token':
          return await this.handleExchangeCodeForToken(args);
        case 'refresh_token':
          return await this.handleRefreshToken(args);
        case 'get_user_info':
          return await this.handleGetUserInfo(args);
        case 'set_access_token':
          return await this.handleSetAccessToken(args);
        case 'get_auth_status':
          return await this.handleGetAuthStatus(args);
        case 'clear_auth':
          return await this.handleClearAuth(args);

        // 任务管理工具
        case 'create_task':
          return await this.handleCreateTask(args);
        case 'search_tasks':
          return await this.handleSearchTasks(args);
        case 'update_task':
          return await this.handleUpdateTask(args);

        // 时间追踪工具
        case 'start_task_timer':
          return await this.handleStartTaskTimer(args);
        case 'stop_task_timer':
          return await this.handleStopTaskTimer(args);

        // 分类管理工具
        case 'get_categories':
          return await this.handleGetCategories(args);
        case 'create_category':
          return await this.handleCreateCategory(args);

        default:
          throw new Error(`未知的工具: ${name}`);
      }
    } catch (error) {
      console.error(`Tool call error for ${name}:`, error);
      throw error;
    }
  }
}
