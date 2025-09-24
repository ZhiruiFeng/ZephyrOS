import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const memoryTools: Tool[] = [
  {
    name: 'add_memory',
    description: 'Create a new memory/note in ZMemory with rich metadata. Use for capturing thoughts, insights, quotes, or any information worth remembering. Supports emotional context, location, importance rating, and tags. Returns created memory with unique ID.',
    inputSchema: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Main content of the memory - what you want to remember', minLength: 1 },
        memory_type: {
          type: 'string',
          enum: ['note', 'link', 'file', 'thought', 'quote', 'insight'],
          default: 'note',
          description: 'Type of memory: "note" for general notes, "thought" for reflections, "quote" for memorable quotes, "insight" for key realizations, "link" for web resources, "file" for document references'
        },
        title: { type: 'string', description: '记忆标题（可选，用于覆盖自动生成的标题）' },
        emotion_valence: {
          type: 'integer',
          minimum: -5,
          maximum: 5,
          description: '情感效价（-5到5，负值表示消极，正值表示积极）'
        },
        emotion_arousal: {
          type: 'integer',
          minimum: -5,
          maximum: 5,
          description: '情感唤醒度（-5到5，负值表示平静，正值表示兴奋）'
        },
        energy_delta: {
          type: 'integer',
          minimum: -5,
          maximum: 5,
          description: '能量变化（-5到5，记忆对能量水平的影响）'
        },
        place_name: { type: 'string', description: '地点名称' },
        latitude: { type: 'number', description: '地理位置纬度' },
        longitude: { type: 'number', description: '地理位置经度' },
        is_highlight: { type: 'boolean', default: false, description: '是否为重要记忆' },
        salience_score: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: '重要性评分（0.0-1.0）'
        },
        category_id: { type: 'string', description: '分类ID' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
        happened_range: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time', description: '事件开始时间' },
            end: { type: 'string', format: 'date-time', description: '事件结束时间' }
          },
          description: '事件发生的时间范围'
        },
        captured_at: { type: 'string', format: 'date-time', description: '记录时间（默认为当前时间）' }
      },
      required: ['note'],
    },
  },
  {
    name: 'search_memories',
    description: '搜索和筛选记忆，支持多种条件组合，包括类型、情感、位置、时间范围等高级筛选',
    inputSchema: {
      type: 'object',
      properties: {
        memory_type: {
          type: 'string',
          enum: ['note', 'link', 'file', 'thought', 'quote', 'insight'],
          description: '按记忆类型筛选'
        },
        status: {
          type: 'string',
          enum: ['active', 'archived', 'deleted'],
          description: '按状态筛选'
        },
        is_highlight: { type: 'boolean', description: '只显示重要记忆' },
        search: { type: 'string', description: '全文搜索记忆内容' },
        tags: { type: 'string', description: '按标签筛选（逗号分隔）' },
        place_name: { type: 'string', description: '按地点名称筛选' },
        min_emotion_valence: {
          type: 'integer',
          minimum: -5,
          maximum: 5,
          description: '最低情感效价'
        },
        max_emotion_valence: {
          type: 'integer',
          minimum: -5,
          maximum: 5,
          description: '最高情感效价'
        },
        min_salience: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: '最低重要性评分'
        },
        captured_from: { type: 'string', format: 'date-time', description: '记录时间起始范围' },
        captured_to: { type: 'string', format: 'date-time', description: '记录时间结束范围' },
        near_lat: { type: 'number', description: '搜索位置纬度（配合near_lng和distance_km使用）' },
        near_lng: { type: 'number', description: '搜索位置经度' },
        distance_km: { type: 'number', description: '搜索半径（公里）' },
        category_id: { type: 'string', description: '按分类ID筛选' },
        sort_by: {
          type: 'string',
          enum: ['captured_at', 'happened_at', 'salience_score', 'emotion_valence', 'updated_at'],
          default: 'captured_at',
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
    description: '更新现有记忆的内容，支持修改所有记忆属性包括情感、位置、重要性等',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '记忆ID' },
        note: { type: 'string', description: '记忆内容' },
        title: { type: 'string', description: '记忆标题' },
        memory_type: {
          type: 'string',
          enum: ['note', 'link', 'file', 'thought', 'quote', 'insight'],
          description: '记忆类型'
        },
        emotion_valence: { type: 'integer', minimum: -5, maximum: 5, description: '情感效价' },
        emotion_arousal: { type: 'integer', minimum: -5, maximum: 5, description: '情感唤醒度' },
        energy_delta: { type: 'integer', minimum: -5, maximum: 5, description: '能量变化' },
        place_name: { type: 'string', description: '地点名称' },
        is_highlight: { type: 'boolean', description: '是否为重要记忆' },
        salience_score: { type: 'number', minimum: 0, maximum: 1, description: '重要性评分' },
        tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
        category_id: { type: 'string', description: '分类ID' },
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
    description: '获取记忆统计信息，包括总数、类型分布、状态分布、情感分布等',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];