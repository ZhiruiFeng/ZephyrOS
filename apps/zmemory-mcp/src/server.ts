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
  AddMemoryParamsSchema,
  SearchMemoriesParamsSchema,
  UpdateMemoryParamsSchema,
  GetMemoryParamsSchema,
  DeleteMemoryParamsSchema,
  AuthenticateParamsSchema,
  RefreshTokenParamsSchema,
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
          
          // 记忆管理工具
          case 'add_memory':
            return await this.handleAddMemory(args);
          case 'search_memories':
            return await this.handleSearchMemories(args);
          case 'get_memory':
            return await this.handleGetMemory(args);
          case 'update_memory':
            return await this.handleUpdateMemory(args);
          case 'delete_memory':
            return await this.handleDeleteMemory(args);
          case 'get_memory_stats':
            return await this.handleGetMemoryStats(args);
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
      
      // 记忆管理工具
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
        name: 'delete_memory',
        description: '删除指定的记忆',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: '要删除的记忆ID' },
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

  // 记忆管理处理器
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

  private async handleDeleteMemory(args: any) {
    const params = DeleteMemoryParamsSchema.parse(args);
    await this.zmemoryClient.deleteMemory(params.id);

    return {
      content: [
        {
          type: 'text',
          text: `成功删除记忆: ${params.id}`,
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
}
