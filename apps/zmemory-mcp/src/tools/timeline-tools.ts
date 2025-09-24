import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const timelineTools: Tool[] = [
  {
    name: 'get_timeline_items',
    description: '获取统一时间线视图，包含任务、记忆、活动等所有类型的条目，支持高级筛选和排序',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['task', 'activity', 'routine', 'habit', 'memory'],
          description: '按条目类型筛选'
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'completed', 'cancelled', 'archived'],
          description: '按状态筛选'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: '按优先级筛选'
        },
        category_id: { type: 'string', description: '按分类ID筛选' },
        search: { type: 'string', description: '跨所有类型的全文搜索' },
        tags: { type: 'string', description: '按标签筛选（逗号分隔）' },
        is_highlight: { type: 'boolean', description: '只显示重要条目（适用于记忆）' },
        memory_type: {
          type: 'string',
          enum: ['note', 'link', 'file', 'thought', 'quote', 'insight'],
          description: '记忆类型筛选'
        },
        render_on_timeline: { type: 'boolean', description: '是否在时间线上显示' },
        sort_by: {
          type: 'string',
          enum: ['created_at', 'updated_at', 'title', 'priority', 'captured_at', 'salience_score'],
          default: 'created_at',
          description: '排序字段'
        },
        sort_order: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
          description: '排序方向'
        },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 50, description: '返回数量限制' },
        offset: { type: 'number', minimum: 0, default: 0, description: '分页偏移' },
      },
      required: [],
    },
  },
  {
    name: 'create_timeline_item',
    description: '创建新的时间线条目，支持创建任务、活动、习惯、记忆等各种类型',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['task', 'activity', 'routine', 'habit', 'memory'],
          description: '条目类型'
        },
        title: { type: 'string', minLength: 1, maxLength: 500, description: '标题' },
        description: { type: 'string', description: '描述' },
        start_time: { type: 'string', format: 'date-time', description: '开始时间' },
        end_time: { type: 'string', format: 'date-time', description: '结束时间' },
        category_id: { type: 'string', description: '分类ID' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'completed', 'cancelled', 'archived'],
          default: 'active',
          description: '状态'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
          description: '优先级'
        },
        metadata: { type: 'object', description: '额外元数据' },
      },
      required: ['type', 'title'],
    },
  },
  {
    name: 'get_timeline_insights',
    description: '获取时间线数据洞察，包括生产力趋势、活动模式、时间分配等智能分析',
    inputSchema: {
      type: 'object',
      properties: {
        date_range: {
          type: 'string',
          enum: ['today', 'week', 'month', 'quarter', 'year'],
          default: 'week',
          description: '分析时间范围'
        },
        timezone: { type: 'string', description: '时区标识符' },
      },
      required: [],
    },
  },
  {
    name: 'search_across_timeline',
    description: '跨时间线条目的智能搜索，支持语义搜索和复杂查询条件组合',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索查询（支持自然语言）' },
        include_types: {
          type: 'array',
          items: { type: 'string', enum: ['task', 'activity', 'routine', 'habit', 'memory'] },
          description: '包含的条目类型'
        },
        date_from: { type: 'string', format: 'date-time', description: '搜索起始日期' },
        date_to: { type: 'string', format: 'date-time', description: '搜索结束日期' },
        context_depth: {
          type: 'integer',
          minimum: 1,
          maximum: 5,
          default: 2,
          description: '上下文深度（相关度搜索范围）'
        },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: '返回数量限制' },
      },
      required: ['query'],
    },
  },
];