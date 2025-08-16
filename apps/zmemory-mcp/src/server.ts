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
  ZMemoryError,
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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
