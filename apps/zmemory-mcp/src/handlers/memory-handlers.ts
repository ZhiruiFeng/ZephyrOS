import { ZMemoryClient } from '../zmemory-client.js';
import {
  AddMemoryParamsSchema,
  SearchMemoriesParamsSchema,
  GetMemoryParamsSchema,
  UpdateMemoryParamsSchema,
  DeleteMemoryParamsSchema
} from '../types.js';

export class MemoryHandlers {
  constructor(private zmemoryClient: ZMemoryClient) {}

  async handleAddMemory(args: any) {
    const params = AddMemoryParamsSchema.parse(args);
    const memory = await this.zmemoryClient.addMemory(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功添加记忆: ${memory.title || memory.note?.substring(0, 50) + '...' || memory.id}`,
        },
        {
          type: 'text',
          text: `记忆详情:
ID: ${memory.id}
类型: ${memory.memory_type}
${memory.emotion_valence ? `情感效价: ${memory.emotion_valence}` : ''}
${memory.place_name ? `地点: ${memory.place_name}` : ''}
${memory.is_highlight ? '✨ 重要记忆' : ''}
创建时间: ${memory.created_at}`,
        },
      ],
    };
  }

  async handleSearchMemories(args: any) {
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
      .map((memory: any) => {
        const title = memory.title_override || memory.note?.substring(0, 60) + '...' || `记忆-${memory.id.substring(0, 8)}`;
        const type = memory.memory_type ? ` [${memory.memory_type}]` : '';
        const emotion = memory.emotion_valence ? ` (情感: ${memory.emotion_valence > 0 ? '+' : ''}${memory.emotion_valence})` : '';
        const place = memory.place_name ? ` @${memory.place_name}` : '';
        const highlight = memory.is_highlight ? ' ✨' : '';
        return `• ${title}${type}${emotion}${place}${highlight} (ID: ${memory.id})`;
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

  async handleGetMemory(args: any) {
    const params = GetMemoryParamsSchema.parse(args);
    const memory = await this.zmemoryClient.getMemory(params.id);

    const tags = memory.tags?.join(', ') || '无';

    return {
      content: [
        {
          type: 'text',
          text: `记忆详情:
ID: ${memory.id}
类型: ${memory.memory_type}
标题: ${memory.title_override || '（自动生成）'}
标签: ${tags}
${memory.emotion_valence ? `情感效价: ${memory.emotion_valence}` : ''}
${memory.emotion_arousal ? `情感唤醒: ${memory.emotion_arousal}` : ''}
${memory.energy_delta ? `能量影响: ${memory.energy_delta}` : ''}
${memory.place_name ? `地点: ${memory.place_name}` : ''}
${memory.salience_score ? `重要性: ${(memory.salience_score * 100).toFixed(1)}%` : ''}
${memory.is_highlight ? '✨ 重要记忆' : ''}
创建时间: ${memory.created_at}
更新时间: ${memory.updated_at}

内容:
${memory.note}`,
        },
      ],
    };
  }

  async handleUpdateMemory(args: any) {
    const params = UpdateMemoryParamsSchema.parse(args);
    const memory = await this.zmemoryClient.updateMemory(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功更新记忆: ${memory.title_override || memory.note?.substring(0, 50) + '...' || memory.id}`,
        },
        {
          type: 'text',
          text: `更新时间: ${memory.updated_at}`,
        },
      ],
    };
  }

  async handleDeleteMemory(args: any) {
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

  async handleGetMemoryStats(args: any) {
    const stats = await this.zmemoryClient.getStats();

    const typeStats = Object.entries(stats.by_type || {})
      .map(([type, count]) => `  ${type}: ${count}`)
      .join('\n');

    const statusStats = Object.entries(stats.by_status || {})
      .map(([status, count]) => `  ${status}: ${count}`)
      .join('\n');

    const emotionStats = stats.by_emotion ? Object.entries(stats.by_emotion)
      .map(([emotion, count]) => `  ${emotion}: ${count}`)
      .join('\n') : '';

    return {
      content: [
        {
          type: 'text',
          text: `记忆统计信息:

总记忆数: ${stats.total || 0}
最近24小时新增: ${stats.recent_count || 0}
重要记忆数: ${stats.highlights || 0}

按类型分布:
${typeStats || '  暂无数据'}

按状态分布:
${statusStats || '  暂无数据'}

${emotionStats ? `按情感分布:\n${emotionStats}` : ''}`,
        },
      ],
    };
  }
}