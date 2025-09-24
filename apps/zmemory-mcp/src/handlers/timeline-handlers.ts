import { ZMemoryClient } from '../zmemory-client.js';
import {
  GetTimelineItemsParamsSchema,
  CreateTimelineItemParamsSchema,
  GetTimelineInsightsParamsSchema,
  SearchAcrossTimelineParamsSchema
} from '../types.js';

export class TimelineHandlers {
  constructor(private zmemoryClient: ZMemoryClient) {}

  async handleGetTimelineItems(args: any) {
    const params = GetTimelineItemsParamsSchema.parse(args);
    const items = await this.zmemoryClient.getTimelineItems(params);

    if (items.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: '未找到匹配的时间线条目',
          },
        ],
      };
    }

    const itemList = items
      .map((item: any) => {
        const title = item.display_title || item.title || `${item.type}-${item.id.substring(0, 8)}`;
        const type = item.type ? ` [${item.type}]` : '';
        const status = item.status ? ` (${item.status})` : '';
        const priority = item.priority && item.priority !== 'medium' ? ` [${item.priority}]` : '';
        const highlight = item.is_highlight ? ' ✨' : '';
        const time = item.captured_at || item.created_at;
        const timeStr = time ? ` - ${new Date(time).toLocaleDateString()}` : '';
        return `• ${title}${type}${status}${priority}${highlight}${timeStr} (ID: ${item.id})`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `找到 ${items.length} 个时间线条目:\n\n${itemList}`,
        },
      ],
    };
  }

  async handleCreateTimelineItem(args: any) {
    const params = CreateTimelineItemParamsSchema.parse(args);
    const item = await this.zmemoryClient.createTimelineItem(params);

    return {
      content: [
        {
          type: 'text',
          text: `成功创建时间线条目: ${item.title}`,
        },
        {
          type: 'text',
          text: `条目详情:
ID: ${item.id}
类型: ${item.type}
状态: ${item.status}
优先级: ${item.priority}
创建时间: ${item.created_at}`,
        },
      ],
    };
  }

  async handleGetTimelineInsights(args: any) {
    const params = GetTimelineInsightsParamsSchema.parse(args);
    const insights = await this.zmemoryClient.getTimelineInsights(params);

    return {
      content: [
        {
          type: 'text',
          text: `时间线数据洞察 (${params.date_range || 'week'}):

📊 总体统计:
- 总条目数: ${insights.total_items || 0}
- 已完成: ${insights.completed_items || 0}
- 完成率: ${insights.completion_rate ? (insights.completion_rate * 100).toFixed(1) : 0}%

📈 生产力趋势:
${insights.productivity_trend ? insights.productivity_trend.map((day: any) =>
  `- ${day.date}: ${day.score}/10`).join('\n') : '- 暂无数据'}

⏰ 时间分配:
${insights.time_distribution ? Object.entries(insights.time_distribution)
  .map(([type, time]) => `- ${type}: ${time}小时`)
  .join('\n') : '- 暂无数据'}

🎯 建议:
${insights.recommendations ? insights.recommendations.join('\n- ') : '暂无建议'}`,
        },
      ],
    };
  }

  async handleSearchAcrossTimeline(args: any) {
    const params = SearchAcrossTimelineParamsSchema.parse(args);
    const results = await this.zmemoryClient.searchAcrossTimeline(params);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `未找到与 "${params.query}" 相关的内容`,
          },
        ],
      };
    }

    const resultList = results
      .map((result: any) => {
        const title = result.title || `${result.type}-${result.id.substring(0, 8)}`;
        const type = result.type ? ` [${result.type}]` : '';
        const relevance = result.relevance_score ? ` (相关度: ${(result.relevance_score * 100).toFixed(0)}%)` : '';
        const snippet = result.snippet ? `\n  "${result.snippet}..."` : '';
        return `• ${title}${type}${relevance}${snippet}`;
      })
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `搜索 "${params.query}" 找到 ${results.length} 个相关结果:\n\n${resultList}`,
        },
      ],
    };
  }
}