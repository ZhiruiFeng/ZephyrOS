# 04 — Context-Aware Usage Scenarios

## 🎯 Complete Workflow Examples

### 📋 Project Management Scenario
**Context**: User is working on a software release and needs to track multiple related tasks.

**User Request**: *"I need to manage the v2.0 release. Create tasks for documentation, testing, and deployment, then start tracking time."*

**Agent Response Workflow**:
```
1. create_task({
   title: "Write v2.0 documentation",
   description: "Complete API docs, changelog, and user guide",
   priority: "high",
   category: "work",
   due_date: "2023-12-15",
   tags: ["v2.0", "documentation"]
})

2. create_task({
   title: "QA testing for v2.0",
   description: "Run full test suite and user acceptance testing",
   priority: "urgent",
   category: "work",
   due_date: "2023-12-18",
   tags: ["v2.0", "testing"]
})

3. create_task({
   title: "Deploy v2.0 to production",
   description: "Coordinate deployment with DevOps team",
   priority: "high",
   category: "work",
   due_date: "2023-12-20",
   tags: ["v2.0", "deployment"]
})

4. search_tasks({ tags: ["v2.0"], status: "pending" })
   → Returns all v2.0 tasks for review

5. start_task_timer({ task_id: "first_task_id", description: "Starting documentation work" })
   → Begin time tracking
```

### 🧠 Learning & Memory Scenario
**Context**: User attended a conference and wants to capture insights with rich context.

**User Request**: *"I learned about microservices patterns at the conference today. The speaker mentioned event sourcing for data consistency. Save this with my learning goals."*

**Agent Response Workflow**:
```
1. add_memory({
   note: "Event sourcing pattern for microservices data consistency. Speaker: Dr. Sarah Chen at DevConf 2023. Key insight: Use event store as single source of truth, rebuild state from events. Solves distributed transaction problems.",
   memory_type: "insight",
   title: "Event Sourcing for Microservices",
   importance: 4,
   emotion_valence: 3,
   location: "DevConf 2023, San Francisco",
   tags: ["microservices", "event-sourcing", "architecture", "conference", "learning"]
})

2. search_memories({
   tags: ["microservices"],
   importance_min: 3,
   sort_by: "importance"
})
   → Find related microservices learnings

3. add_memory({
   note: "Need to research: CQRS pattern, Kafka for event streaming, testing strategies for event-driven systems",
   memory_type: "note",
   title: "Follow-up research from DevConf",
   importance: 3,
   tags: ["todo", "research", "microservices"],
   associations: ["previous_memory_id"]
})
```

### ⏰ Daily Review Scenario
**Context**: User wants to review their productivity and plan the next day.

**User Request**: *"Show me what I accomplished today and how I spent my time."*

**Agent Response Workflow**:
```
1. get_task_updates_for_today()
   → Shows tasks created, completed, or modified today

2. get_day_time_spending({ from: "2023-12-10", to: "2023-12-10" })
   → Shows time breakdown by task/category

3. get_timeline_items({
   start_date: "2023-12-10",
   end_date: "2023-12-10",
   item_types: ["task", "activity", "memory"]
})
   → Shows comprehensive timeline for the day

4. get_timeline_insights({
   start_date: "2023-12-10",
   end_date: "2023-12-10"
})
   → Generates productivity insights and patterns

5. create_activity({
   type: "reflection",
   description: "Daily review: Completed 3 tasks, spent 4.5h on development, learned about event sourcing. Tomorrow focus on documentation.",
   duration_minutes: 15,
   mood_after: 4,
   energy_after: 3
})
   → Log the review session itself
```

### 🤖 AI Agent Coordination Scenario
**Context**: Multiple AI agents are working on different aspects of a project.

**User Request**: *"Agent Alpha, check if there are any tasks assigned to you and start working on them."*

**Agent Response Workflow**:
```
1. get_auth_status()
   → Verify agent can access the system

2. get_queued_tasks_for_agent({ agent_name: "Agent Alpha" })
   → Find tasks specifically assigned to this agent

3. accept_ai_task({
   id: "task_id_1",
   estimated_duration_min: 60,
   agent_notes: "Starting code review for user authentication module"
})
   → Accept the highest priority task

4. update_ai_task({
   id: "task_id_1",
   status: "in_progress",
   progress_notes: "Reviewing authentication.py, found 3 potential security issues"
})
   → Provide progress updates

5. complete_ai_task({
   id: "task_id_1",
   output: "Code review completed. Security improvements implemented in auth module.",
   artifacts: ["security_report.md", "fixed_auth.py"],
   actual_duration_min: 45,
   metrics: { "issues_found": 3, "issues_fixed": 3 }
})
   → Mark task complete with detailed results
```

## 🔧 Error Recovery Examples

### Authentication Issues
**Scenario**: Agent loses authentication mid-session

```
1. Any operation fails with auth error
   ↓
2. get_auth_status()
   → Shows token expired
   ↓
3. refresh_token({ refresh_token: "stored_refresh_token" })
   → Get new access token
   ↓
4. Retry original operation
   → Should now succeed
```

### Timer Management
**Scenario**: User forgets they have a timer running

**User Request**: *"Start tracking time for the new documentation task"*

```
1. start_task_timer({ task_id: "new_doc_task" })
   → Fails because another timer is running
   ↓
2. get_running_timer()
   → Shows timer running for different task
   ↓
3. stop_task_timer({ task_id: "previous_task_id" })
   → Stop the previous timer
   ↓
4. start_task_timer({ task_id: "new_doc_task" })
   → Successfully start new timer
```

## 💡 Context-Aware Decision Making

### Smart Task Search
**When user says**: *"Show me my urgent work items"*
**Agent should**:
1. `search_tasks({ priority: "urgent", status: "pending" })`
2. If no results: `search_tasks({ priority: "high", status: "pending" })`
3. If still empty: `search_tasks({ status: "pending", sort_by: "priority" })`

### Intelligent Memory Capture
**When user says**: *"I just had a great idea about improving our API performance"*
**Agent should**:
1. `add_memory({ memory_type: "insight", importance: 4, tags: ["api", "performance", "idea"] })`
2. `search_memories({ tags: ["api", "performance"], sort_by: "importance" })`
3. Show related memories to build on the idea

### Contextual Time Tracking
**When user says**: *"I'm done working on the login bug"*
**Agent should**:
1. `search_tasks({ keyword: "login bug", status: "in_progress" })`
2. `stop_task_timer({ task_id: "found_task_id" })`
3. `update_task({ id: "found_task_id", status: "completed" })`

## 🌟 Advanced Scenarios

### Cross-System Integration
**Use Case**: Sync with external project management tools
```
1. search_tasks({ status: "completed", created_after: "2023-12-01" })
2. For each completed task:
   - get_task_time_entries({ task_id: task.id })
   - create_timeline_item({ type: "external_sync", data: task_summary })
```

### Productivity Analytics
**Use Case**: Weekly productivity report
```
1. get_task_stats()
2. get_day_time_spending({ from: "2023-12-04", to: "2023-12-10" })
3. search_activities({ created_after: "2023-12-04", type: "work" })
4. get_timeline_insights({ start_date: "2023-12-04", end_date: "2023-12-10" })
5. create_memory({
   memory_type: "insight",
   note: "Weekly analysis summary with productivity patterns",
   tags: ["productivity", "weekly-review", "analytics"]
})
```

## 📚 Best Practices for Context

1. **Always check existing data first** - Use search before create
2. **Provide rich context** - Include relevant tags, descriptions, and metadata
3. **Follow logical sequences** - Chain related operations naturally
4. **Handle edge cases gracefully** - Check for running timers, expired auth, etc.
5. **Build context over time** - Use associations and tags to connect related items

## 🎯 Locale Tips
- Default uses auto detection; if English prompts yield Chinese responses (or vice versa), call `set_locale({ locale: 'en' | 'zh' })`.
- You can also set `ZMEMORY_MCP_LOCALE` in environment variables for a default.
- Agents should adapt language based on user's preferred communication style.
