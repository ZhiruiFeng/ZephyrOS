import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const activityTools: Tool[] = [
  {
    name: 'create_activity',
    description: '记录一项活动，支持详细的心情、能量、满意度跟踪以及上下文信息',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '活动标题', maxLength: 500 },
        description: { type: 'string', description: '活动描述' },
        activity_type: {
          type: 'string',
          enum: ['exercise', 'meditation', 'reading', 'music', 'socializing', 'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other'],
          description: '活动类型'
        },
        started_at: { type: 'string', format: 'date-time', description: '活动开始时间' },
        ended_at: { type: 'string', format: 'date-time', description: '活动结束时间' },
        duration_minutes: { type: 'number', description: '持续时间（分钟）' },
        mood_before: { type: 'integer', minimum: 1, maximum: 10, description: '活动前心情（1-10）' },
        mood_after: { type: 'integer', minimum: 1, maximum: 10, description: '活动后心情（1-10）' },
        energy_before: { type: 'integer', minimum: 1, maximum: 10, description: '活动前能量水平（1-10）' },
        energy_after: { type: 'integer', minimum: 1, maximum: 10, description: '活动后能量水平（1-10）' },
        satisfaction_level: { type: 'integer', minimum: 1, maximum: 10, description: '满意度（1-10）' },
        intensity_level: {
          type: 'string',
          enum: ['low', 'moderate', 'high'],
          description: '强度水平'
        },
        location: { type: 'string', description: '地点' },
        weather: { type: 'string', description: '天气情况' },
        companions: { type: 'array', items: { type: 'string' }, description: '同伴列表' },
        notes: { type: 'string', description: '活动备注' },
        insights: { type: 'string', description: '活动感悟或收获' },
        gratitude: { type: 'string', description: '感恩记录' },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'cancelled'],
          default: 'completed',
          description: '活动状态'
        },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
        category_id: { type: 'string', description: '分类ID' },
      },
      required: ['title', 'activity_type'],
    },
  },
  {
    name: 'search_activities',
    description: '搜索和筛选活动记录，支持按类型、状态、心情、满意度、时间等条件筛选',
    inputSchema: {
      type: 'object',
      properties: {
        activity_type: {
          type: 'string',
          enum: ['exercise', 'meditation', 'reading', 'music', 'socializing', 'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other'],
          description: '按活动类型筛选'
        },
        status: {
          type: 'string',
          enum: ['active', 'completed', 'cancelled'],
          description: '按活动状态筛选'
        },
        intensity_level: {
          type: 'string',
          enum: ['low', 'moderate', 'high'],
          description: '按强度水平筛选'
        },
        min_satisfaction: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: '最低满意度'
        },
        min_mood_after: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          description: '活动后最低心情'
        },
        location: { type: 'string', description: '按地点筛选' },
        from: { type: 'string', format: 'date-time', description: '活动开始时间晚于此时间' },
        to: { type: 'string', format: 'date-time', description: '活动开始时间早于此时间' },
        search: { type: 'string', description: '在标题、描述、备注中搜索关键词' },
        tags: { type: 'string', description: '按标签筛选（逗号分隔）' },
        category_id: { type: 'string', description: '按分类ID筛选' },
        sort_by: {
          type: 'string',
          enum: ['started_at', 'satisfaction_level', 'mood_after', 'title', 'created_at'],
          default: 'started_at',
          description: '排序字段'
        },
        sort_order: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'desc',
          description: '排序方向'
        },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20, description: '返回数量限制' },
        offset: { type: 'number', minimum: 0, default: 0, description: '分页偏移' },
      },
      required: [],
    },
  },
  {
    name: 'get_activity',
    description: '根据ID获取特定活动的详细信息',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '活动ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_activity',
    description: '更新现有活动的信息',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '活动ID' },
        title: { type: 'string', description: '活动标题' },
        description: { type: 'string', description: '活动描述' },
        activity_type: {
          type: 'string',
          enum: ['exercise', 'meditation', 'reading', 'music', 'socializing', 'gaming', 'walking', 'cooking', 'rest', 'creative', 'learning', 'other'],
          description: '活动类型'
        },
        ended_at: { type: 'string', format: 'date-time', description: '活动结束时间' },
        mood_after: { type: 'integer', minimum: 1, maximum: 10, description: '活动后心情' },
        energy_after: { type: 'integer', minimum: 1, maximum: 10, description: '活动后能量水平' },
        satisfaction_level: { type: 'integer', minimum: 1, maximum: 10, description: '满意度' },
        intensity_level: { type: 'string', enum: ['low', 'moderate', 'high'], description: '强度水平' },
        notes: { type: 'string', description: '活动备注' },
        insights: { type: 'string', description: '活动感悟' },
        gratitude: { type: 'string', description: '感恩记录' },
        status: { type: 'string', enum: ['active', 'completed', 'cancelled'], description: '活动状态' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_activity_stats',
    description: '获取活动统计信息，包括类型分布、心情能量趋势、满意度等数据',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];