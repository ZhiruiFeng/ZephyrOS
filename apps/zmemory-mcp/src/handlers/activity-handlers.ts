import { ZMemoryClient } from '../zmemory-client.js';
import {
  CreateActivityParamsSchema,
  SearchActivitiesParamsSchema,
  GetActivityParamsSchema,
  UpdateActivityParamsSchema
} from '../types.js';

export class ActivityHandlers {
  constructor(private zmemoryClient: ZMemoryClient) {}

  async handleCreateActivity(args: any) {
    const params = CreateActivityParamsSchema.parse(args);
    const activity = await this.zmemoryClient.createActivity(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功创建活动: ${activity.title}`,
        },
        {
          type: 'text',
          text: `活动详情:
ID: ${activity.id}
类型: ${activity.activity_type}
${activity.mood_before && activity.mood_after ? `心情变化: ${activity.mood_before} → ${activity.mood_after}` : ''}
${activity.energy_before && activity.energy_after ? `能量变化: ${activity.energy_before} → ${activity.energy_after}` : ''}
${activity.satisfaction_level ? `满意度: ${activity.satisfaction_level}/10` : ''}
状态: ${activity.status}
创建时间: ${activity.created_at}`,
        },
      ],
    };
  }

  async handleSearchActivities(args: any) {
    const params = SearchActivitiesParamsSchema.parse(args);
    const activities = await this.zmemoryClient.searchActivities(params);

    if (activities.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '未找到匹配的活动',
          },
        ],
      };
    }

    const activityList = activities
      .map((activity: any) => {
        const title = activity.title || `活动-${activity.id.substring(0, 8)}`;
        const type = activity.activity_type ? ` [${activity.activity_type}]` : '';
        const mood = activity.mood_after ? ` (心情: ${activity.mood_after}/10)` : '';
        const satisfaction = activity.satisfaction_level ? ` (满意: ${activity.satisfaction_level}/10)` : '';
        const duration = activity.duration_minutes ? ` (${activity.duration_minutes}分钟)` : '';
        return `• ${title}${type}${mood}${satisfaction}${duration} (ID: ${activity.id})`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `找到 ${activities.length} 项活动:\n\n${activityList}`,
        },
      ],
    };
  }

  async handleGetActivity(args: any) {
    const params = GetActivityParamsSchema.parse(args);
    const activity = await this.zmemoryClient.getActivity(params.id);

    const tags = activity.tags?.join(', ') || '无';
    const companions = activity.companions?.join(', ') || '无';

    return {
      content: [
        {
          type: 'text',
          text: `活动详情:
ID: ${activity.id}
标题: ${activity.title}
类型: ${activity.activity_type}
${activity.description ? `描述: ${activity.description}` : ''}
${activity.started_at ? `开始时间: ${activity.started_at}` : ''}
${activity.ended_at ? `结束时间: ${activity.ended_at}` : ''}
${activity.duration_minutes ? `持续时间: ${activity.duration_minutes}分钟` : ''}
${activity.mood_before ? `活动前心情: ${activity.mood_before}/10` : ''}
${activity.mood_after ? `活动后心情: ${activity.mood_after}/10` : ''}
${activity.energy_before ? `活动前能量: ${activity.energy_before}/10` : ''}
${activity.energy_after ? `活动后能量: ${activity.energy_after}/10` : ''}
${activity.satisfaction_level ? `满意度: ${activity.satisfaction_level}/10` : ''}
${activity.intensity_level ? `强度: ${activity.intensity_level}` : ''}
${activity.location ? `地点: ${activity.location}` : ''}
${activity.weather ? `天气: ${activity.weather}` : ''}
同伴: ${companions}
标签: ${tags}
状态: ${activity.status}
${activity.notes ? `备注: ${activity.notes}` : ''}
${activity.insights ? `感悟: ${activity.insights}` : ''}
${activity.gratitude ? `感恩: ${activity.gratitude}` : ''}
创建时间: ${activity.created_at}
更新时间: ${activity.updated_at}`,
        },
      ],
    };
  }

  async handleUpdateActivity(args: any) {
    const params = UpdateActivityParamsSchema.parse(args);
    const activity = await this.zmemoryClient.updateActivity(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功更新活动: ${activity.title}`,
        },
        {
          type: 'text',
          text: `更新时间: ${activity.updated_at}`,
        },
      ],
    };
  }

  async handleGetActivityStats(args: any) {
    const stats = await this.zmemoryClient.getActivityStats();

    const typeStats = Object.entries(stats.by_type || {})
      .map(([type, count]) => `  ${type}: ${count}`)
      .join('\n');

    const statusStats = Object.entries(stats.by_status || {})
      .map(([status, count]) => `  ${status}: ${count}`)
      .join('\n');

    const intensityStats = stats.by_intensity ? Object.entries(stats.by_intensity)
      .map(([intensity, count]) => `  ${intensity}: ${count}`)
      .join('\n') : '';

    return {
      content: [
        {
          type: 'text',
          text: `活动统计信息:

总活动数: ${stats.total || 0}
最近7天活动: ${stats.recent_count || 0}
${stats.avg_satisfaction ? `平均满意度: ${stats.avg_satisfaction.toFixed(1)}/10` : ''}
${stats.avg_mood_improvement ? `平均心情提升: +${stats.avg_mood_improvement.toFixed(1)}` : ''}

按类型分布:
${typeStats || '  暂无数据'}

按状态分布:
${statusStats || '  暂无数据'}

${intensityStats ? `按强度分布:\n${intensityStats}` : ''}`,
        },
      ],
    };
  }
}