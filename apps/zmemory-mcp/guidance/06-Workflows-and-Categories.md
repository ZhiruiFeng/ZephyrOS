# 06 — Workflows and Categories

## Tool Categories Overview

The ZMemory MCP service provides 46+ tools organized into 7 functional categories:

### 1. 🔐 Authentication (7 tools)
**Purpose**: Manage OAuth flow and session state
- `authenticate` → Start OAuth flow
- `exchange_code_for_token` → Complete OAuth flow
- `refresh_token` → Maintain session
- `get_auth_status` → Check session validity
- `set_access_token` → Alternative auth method
- `get_user_info` → Verify account
- `clear_auth` → Session cleanup

### 2. 🧠 Memory Management (6 tools)
**Purpose**: CRUD operations for memories and notes
- `add_memory` → Create memories with metadata
- `search_memories` → Find memories by criteria
- `get_memory` → Retrieve specific memory
- `update_memory` → Modify existing memory
- `delete_memory` → Remove memory
- `get_memory_stats` → Usage analytics

### 3. ✅ Task Management (6 tools)
**Purpose**: Complete task lifecycle management
- `create_task` → Create new tasks
- `search_tasks` → Find tasks by criteria
- `get_task` → Retrieve specific task
- `update_task` → Modify task details
- `get_task_stats` → Task analytics
- `get_task_updates_for_today` → Daily task changes
- `get_task_updates_for_date` → Historical task changes

### 4. ⏱️ Time Tracking (5 tools)
**Purpose**: Track time spent on tasks
- `start_task_timer` → Begin time tracking
- `stop_task_timer` → End time tracking
- `get_running_timer` → Check active timer
- `get_task_time_entries` → Time history for task
- `get_day_time_spending` → Daily time analytics

### 5. 📊 Activities (5 tools)
**Purpose**: Log and analyze user activities
- `create_activity` → Record activities
- `search_activities` → Find activities
- `get_activity` → Retrieve activity details
- `update_activity` → Modify activities
- `get_activity_stats` → Activity analytics

### 6. 📅 Timeline & Search (4 tools)
**Purpose**: Cross-system timeline and insights
- `get_timeline_items` → Retrieve timeline entries
- `create_timeline_item` → Add timeline entry
- `get_timeline_insights` → Generate insights
- `search_across_timeline` → Cross-type search

### 7. 🤖 AI Tasks (8 tools)
**Purpose**: Manage AI agent task queues
- `get_ai_tasks` → List AI tasks
- `get_queued_tasks_for_agent` → Agent-specific queue
- `get_ai_task` → Task details
- `accept_ai_task` → Accept assignment
- `update_ai_task` → Modify AI task
- `complete_ai_task` → Mark as completed
- `fail_ai_task` → Mark as failed
- `get_ai_task_stats` → AI task analytics

## Common Workflows

### 🚀 Getting Started Workflow
```
1. authenticate
   ↓ (user completes OAuth)
2. exchange_code_for_token
   ↓
3. get_auth_status (verify)
   ↓
4. get_user_info (confirm account)
```

### 📝 Task Management Workflow
```
Basic Task Creation:
create_task → start_task_timer → [work] → stop_task_timer → update_task

Task Discovery:
search_tasks → get_task → update_task
```

### 💭 Memory Capture Workflow
```
Simple Memory:
add_memory → get_memory_stats

Memory Research:
search_memories → get_memory → update_memory → delete_memory
```

### 📈 Daily Review Workflow
```
get_task_updates_for_today
    ↓
get_day_time_spending
    ↓
get_timeline_items (day range)
    ↓
get_timeline_insights
```

### 🔄 Session Management
```
Startup:
get_auth_status → [if expired] → refresh_token

Cleanup:
clear_auth → [session ends]
```

## Workflow Decision Tree

```
START → Need Authentication?
├─ YES → authenticate → exchange_code_for_token → Continue
└─ NO → Continue

Continue → What do you want to do?
├─ Manage Tasks → create_task | search_tasks | update_task
├─ Track Time → start_task_timer → stop_task_timer
├─ Capture Memory → add_memory | search_memories
├─ Review Activity → get_timeline_items → get_timeline_insights
├─ AI Agent Work → get_queued_tasks_for_agent → accept_ai_task
└─ Check Status → get_auth_status | get_*_stats
```

## Tool Relationship Map

```
Authentication Layer (Required First)
     authenticate ←→ exchange_code_for_token ←→ refresh_token
            ↓
     All Other Operations
            ↓
┌─── Memory ───────┬─── Tasks ────────┬─── Time ─────────┐
│                  │                  │                  │
│ add_memory       │ create_task      │ start_task_timer │
│      ↓           │      ↓           │      ↓           │
│ search_memories  │ search_tasks ←───┼─ stop_task_timer │
│      ↓           │      ↓           │      ↓           │
│ get_memory       │ update_task      │ get_running_timer│
│      ↓           │                  │                  │
│ update_memory    │                  │                  │
└──────────────────┴──────────────────┴──────────────────┘
            ↓
     Timeline Integration
            ↓
  get_timeline_items → get_timeline_insights
```

## Agent Usage Patterns

### 🎯 Task-Oriented Agent
**Common Sequence**: `search_tasks` → `get_task` → `start_task_timer` → `update_task` → `stop_task_timer`

### 📚 Knowledge Agent
**Common Sequence**: `search_memories` → `add_memory` → `search_across_timeline`

### 📊 Analytics Agent
**Common Sequence**: `get_task_stats` → `get_day_time_spending` → `get_timeline_insights`

### 🤖 AI Coordinator
**Common Sequence**: `get_queued_tasks_for_agent` → `accept_ai_task` → `update_ai_task` → `complete_ai_task`

## Best Practices for Agents

1. **Always check auth first**: Use `get_auth_status` before operations
2. **Use search before create**: Check existing items to avoid duplicates
3. **Batch related operations**: Complete workflows in sequence
4. **Handle errors gracefully**: Use `get_*_stats` for status validation
5. **Clean up sessions**: Use `clear_auth` when switching contexts

## Error Recovery Workflows

### Authentication Expired
```
Operation Fails → get_auth_status → refresh_token → Retry Operation
```

### Timer Issues
```
start_task_timer fails → get_running_timer → stop_task_timer → start_task_timer
```

### Search No Results
```
search_* returns empty → broaden criteria → search_* → [if still empty] → create_*
```