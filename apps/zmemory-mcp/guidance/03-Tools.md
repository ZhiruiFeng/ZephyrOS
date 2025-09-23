# 03 — Tools Reference (EN/中文)

Format: Canonical name — Chinese aliases — API mapping — Example prompts

Authentication
- authenticate — 别名: 认证/授权/登录 — POST /api/oauth/authorize
  - EN: "Start ZMemory OAuth"
  - 中文: "开始 ZMemory 授权"
- exchange_code_for_token — 别名: 用授权码换令牌/交换令牌 — POST /api/oauth/token
- refresh_token — 别名: 刷新令牌 — POST /api/oauth/token
- get_auth_status — 别名: 获取认证状态/认证状态 — GET /api/auth/status (server-derived)
- get_user_info — 别名: 获取用户信息/用户信息 — GET /api/auth/user
- set_access_token — 别名: 设置访问令牌 — n/a (local)
- clear_auth — 别名: 清除认证 — n/a (local)
- set_locale — 别名: 设置语言/切换语言 — n/a (local)

Memories
- add_memory — 别名: 创建记忆/添加记忆/新增记忆 — POST /api/memories
- search_memories — 别名: 搜索记忆/查找记忆/检索记忆 — GET /api/memories
- get_memory — 别名: 获取记忆 — GET /api/memories/:id
- update_memory — 别名: 更新记忆/修改记忆 — PUT /api/memories/:id
- delete_memory — 别名: 删除记忆 — DELETE /api/memories/:id
- get_memory_stats — 别名: 记忆统计/获取记忆统计 — GET /api/tasks/stats (fallback derived)

Tasks
- create_task — 别名: 创建任务/添加任务/新建任务 — POST /api/tasks
- search_tasks — 别名: 搜索任务/查找任务 — GET /api/tasks
- get_task — 别名: 获取任务 — GET /api/tasks/:id
- update_task — 别名: 更新任务/修改任务 — PUT /api/tasks/:id
- get_task_stats — 别名: 任务统计/查看任务统计 — GET /api/tasks/stats
- get_task_updates_for_today — 别名: 今日任务更新/获取今日任务更新 — GET /api/tasks/updated-today
- get_task_updates_for_date — 别名: 指定日期任务更新/获取某日任务更新 — GET /api/tasks/updated-today?start_date&end_date

Time tracking
- get_day_time_spending — 别名: 获取时间花费/时间花费/日时间统计 — GET /api/time-entries/day?from&to
- get_task_time_entries — 别名: 任务时间记录/查看任务时间记录 — GET /api/tasks/:id/time-entries
- start_task_timer — 别名: 开始任务计时/开始计时 — POST /api/tasks/:id/timer/start
- stop_task_timer — 别名: 停止任务计时/停止计时 — POST /api/tasks/:id/timer/stop
- get_running_timer — 别名: 当前计时器/获取正在运行的计时器 — GET /api/time-entries/running

Activities
- create_activity — 别名: 创建活动/记录活动/添加活动 — POST /api/activities
- search_activities — 别名: 搜索活动/查找活动 — GET /api/activities
- get_activity — 别名: 获取活动 — GET /api/activities/:id
- update_activity — 别名: 更新活动/修改活动 — PUT /api/activities/:id
- get_activity_stats — 别名: 活动统计 — GET /api/activities/stats

Timeline & search
- get_timeline_items — 别名: 获取时间线/时间线条目/查看时间线 — GET /api/timeline-items
- create_timeline_item — 别名: 创建时间线条目/新增时间线条目 — POST /api/timeline-items
- get_timeline_insights — 别名: 时间线洞察/时间洞察/生产力洞察 — derived
- search_across_timeline — 别名: 跨时间线搜索/跨类型搜索 — GET /api/timeline-items

AI tasks
- get_ai_tasks — 别名: 获取AI任务/AI任务列表 — GET /api/ai-tasks
- get_queued_tasks_for_agent — 别名: 获取Agent队列任务 — GET /api/ai-tasks
- get_ai_task — 别名: 获取AI任务详情 — GET /api/ai-tasks/:id
- accept_ai_task — 别名: 接受AI任务 — PUT /api/ai-tasks/:id
- update_ai_task — 别名: 更新AI任务 — PUT /api/ai-tasks/:id
- complete_ai_task — 别名: 完成AI任务 — PUT /api/ai-tasks/:id
- fail_ai_task — 别名: 标记AI任务失败 — PUT /api/ai-tasks/:id
- get_ai_task_stats — 别名: AI任务统计 — GET /api/ai-tasks/stats
