# 04 — Scenarios (EN/中文)

Daily usage examples

- Create and track tasks / 创建并跟踪任务
  - EN: "Create a high-priority task to prepare the release notes by Friday"
  - 中文: "创建一个高优先级任务，周五前完成发布说明"
  - Tools: create_task → search_tasks → get_task_updates_for_today

- Capture memories with context / 记录带上下文的记忆
  - EN: "Add a memory: Learned MCP alias mapping design"
  - 中文: "添加记忆：完成 MCP 工具别名映射设计"
  - Tools: add_memory → search_memories → get_memory_stats

- Log activities and review wellbeing / 记录活动并回顾状态
  - EN: "Log activity: 30-min walk, mood improved"
  - 中文: "记录活动：步行30分钟，心情变好"
  - Tools: create_activity → search_activities → get_activity_stats

- Review timeline / 回顾时间线
  - EN: "Show my timeline items for this week and insights"
  - 中文: "查看本周时间线与洞察"
  - Tools: get_timeline_items → get_timeline_insights

- Time tracking / 时间追踪
  - EN: "Start a timer for task X, then stop it after 45 minutes"
  - 中文: "为任务X开始计时，45分钟后停止"
  - Tools: start_task_timer → stop_task_timer → get_day_time_spending

Locale tips
- Default uses auto detection; if English prompts yield Chinese responses (or vice versa), call set_locale { locale: 'en' | 'zh' }.
- You can also set ZMEMORY_MCP_LOCALE in environment variables for a default.
