# Claude Code + ZMemory MCP Integration Guide

Complete guide for connecting ZMemory MCP Server with Claude Code to access your ZephyrOS data directly in Claude Code conversations.

## 🎯 Overview

This integration allows Claude Code to:
- 🧠 Search and manage your memories
- ✅ Create and track tasks
- 📊 Log and analyze activities
- 📅 Access unified timeline data
- 🔐 Authenticate securely with ZMemory

**46 tools available** for comprehensive ZephyrOS ecosystem access.

## 🚀 Quick Setup

### Step 1: Prepare ZMemory MCP Server

```bash
# Navigate to zmemory-mcp directory
cd /Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-mcp

# Install dependencies (if not already done)
npm install

# Build the server
npm run build

# Verify it works
npm run dev
# You should see: "ZMemory MCP服务器已启动"
```

### Step 2: Configure Claude Code

#### Option A: Development Setup (TypeScript)

Add this to your Claude Code MCP configuration:

```json
{
  "mcp": {
    "servers": {
      "zmemory": {
        "command": "tsx",
        "args": ["/Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-mcp/src/index.ts"],
        "env": {
          "ZMEMORY_API_URL": "http://localhost:3001",
          "OAUTH_CLIENT_ID": "zmemory-mcp",
          "OAUTH_CLIENT_SECRET": "a93ca3fbba42481cd18606208476c5bfc7e592aff66560443c08b7b8545eebb6",
          "OAUTH_REDIRECT_URI": "http://localhost:3001/oauth/callback",
          "OAUTH_SCOPE": "tasks.write,tasks.read"
        }
      }
    }
  }
}
```

#### Option B: Production Setup (Built JavaScript)

```json
{
  "mcp": {
    "servers": {
      "zmemory": {
        "command": "node",
        "args": ["/Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-mcp/dist/index.js"],
        "env": {
          "ZMEMORY_API_URL": "http://localhost:3001",
          "OAUTH_CLIENT_ID": "zmemory-mcp",
          "OAUTH_CLIENT_SECRET": "a93ca3fbba42481cd18606208476c5bfc7e592aff66560443c08b7b8545eebb6",
          "OAUTH_REDIRECT_URI": "http://localhost:3001/oauth/callback",
          "OAUTH_SCOPE": "tasks.write,tasks.read"
        }
      }
    }
  }
}
```

### Step 3: Install Prerequisites

```bash
# Install tsx globally (for development setup)
npm install -g tsx

# Verify Node.js version (18+ required)
node --version
```

### Step 4: Start Required Services

Before using Claude Code, ensure these services are running:

```bash
# Terminal 1: Start ZMemory API
cd /Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-api
npm run dev

# Terminal 2: Start Redis (optional, for session management)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Terminal 3: (Optional) Start ZFlow for web interface
cd /Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zflow
npm run dev
```

## 🔧 Configuration Details

### Claude Code Settings Location

The MCP configuration goes in your Claude Code settings file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Complete Configuration Example

```json
{
  "mcp": {
    "servers": {
      "zmemory": {
        "command": "tsx",
        "args": ["/Users/zhiruifeng/Workspace/dev/ZephyrOS/apps/zmemory-mcp/src/index.ts"],
        "env": {
          "ZMEMORY_API_URL": "http://localhost:3001",
          "OAUTH_CLIENT_ID": "zmemory-mcp",
          "OAUTH_CLIENT_SECRET": "a93ca3fbba42481cd18606208476c5bfc7e592aff66560443c08b7b8545eebb6",
          "OAUTH_REDIRECT_URI": "http://localhost:3001/oauth/callback",
          "OAUTH_SCOPE": "tasks.write,tasks.read",
          "LOG_LEVEL": "info",
          "MCP_SERVER_TIMEOUT": "10000"
        }
      }
    }
  }
}
```

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ZMEMORY_API_URL` | ZMemory API base URL | `http://localhost:3001` | ✅ |
| `OAUTH_CLIENT_ID` | OAuth client identifier | `zmemory-mcp` | ✅ |
| `OAUTH_CLIENT_SECRET` | OAuth client secret | - | ✅ |
| `OAUTH_REDIRECT_URI` | OAuth callback URL | - | ✅ |
| `OAUTH_SCOPE` | OAuth permissions | `tasks.write,tasks.read` | ✅ |
| `LOG_LEVEL` | Logging level | `info` | ❌ |
| `MCP_SERVER_TIMEOUT` | Request timeout (ms) | `10000` | ❌ |

## 🧪 Testing the Integration

### Step 1: Verify Connection

After configuration, restart Claude Code and check the connection:

1. **Open Claude Code**
2. **Look for MCP indicators** - you should see tool availability
3. **Check logs** - Claude Code may show MCP connection status

### Step 2: Test Basic Functionality

Try these commands in Claude Code:

```
"What MCP tools are available?"
"Check my ZMemory authentication status"
"Search my memories about project planning"
```

### Step 3: Test Tool Categories

**Memory Management:**
```
"Add a memory: 'Completed MCP integration with Claude Code'"
"Search my memories from this week"
"Show me my most important memories"
```

**Task Management:**
```
"Create a task: 'Review MCP documentation' with high priority"
"Show me all pending tasks"
"Update task status to completed"
```

**Activity Tracking:**
```
"Log an activity: 'Deep work on MCP integration' for 2 hours"
"Show me today's activities"
"What's my productivity pattern this week?"
```

**Timeline and Analytics:**
```
"Show me my timeline for today"
"Get insights about my productivity"
"Search across all my data for 'project'"
```

## 🛠️ Available Tools Reference

### 🔐 Authentication (7 tools)
- `authenticate` - Start OAuth flow
- `exchange_code_for_token` - Complete OAuth
- `refresh_token` - Refresh access tokens
- `get_user_info` - Get current user info
- `set_access_token` - Set token directly
- `get_auth_status` - Check auth status
- `clear_auth` - Clear authentication

### 🧠 Memory Management (6 tools)
- `add_memory` - Create memories with rich metadata
- `search_memories` - Full-text and filtered search
- `get_memory` - Get specific memory details
- `update_memory` - Edit existing memories
- `delete_memory` - Remove memories
- `get_memory_stats` - Memory analytics

### ✅ Task Management (11 tools)
- `create_task` - Create tasks with metadata
- `search_tasks` - Search and filter tasks
- `get_task` - Get task details
- `update_task` - Edit task information
- `get_task_stats` - Task analytics
- `get_task_updates_for_today` - Today's changes
- `get_task_updates_for_date` - Date-specific changes
- `get_day_time_spending` - Daily time breakdown
- `get_task_time_entries` - Task time logs
- `start_task_timer` - Start timing
- `stop_task_timer` - Stop timing
- `get_running_timer` - Current timer status

### 📊 Activity Tracking (4 tools)
- `create_activity` - Log activities with mood/energy
- `search_activities` - Search and filter activities
- `get_activity` - Get activity details
- `update_activity` - Edit activities
- `get_activity_stats` - Activity analytics

### 📅 Timeline & Search (4 tools)
- `get_timeline_items` - Unified timeline view
- `create_timeline_item` - Add timeline entries
- `get_timeline_insights` - Timeline analytics
- `search_across_timeline` - Cross-data search

### 🏷️ Categories (4 tools)
- `get_categories` - List all categories
- `create_category` - Create new categories
- `get_category` - Get category details
- `update_category` - Edit categories

### 🤖 AI Task Management (10 tools)
- `get_ai_tasks` - List AI tasks
- `get_queued_tasks_for_agent` - Agent queue
- `get_ai_task` - Get AI task details
- `accept_ai_task` - Accept assignments
- `update_ai_task` - Update progress
- `complete_ai_task` - Mark completed
- `fail_ai_task` - Mark failed
- `get_ai_task_stats` - AI task analytics

## 💬 Example Conversations

### Memory Management
```
You: "Add a memory about today's MCP integration work"

Claude: I'll add a memory about your MCP integration work.
        🔧 [Calling add_memory tool]

        ✅ Added memory: "MCP Integration Work - 2025-09-22"

        The memory has been saved with details about your
        Claude Code integration work today. Would you like me
        to add any specific details or tags?

You: "Search for memories about programming projects"

Claude: I'll search your memories for programming projects.
        🔧 [Calling search_memories tool]

        Found 12 memories about programming projects:
        • MCP Integration Work (today)
        • API Development Project (last week)
        • Frontend Optimization (2 weeks ago)
        ...
```

### Task Management
```
You: "Create a task to document the MCP integration"

Claude: I'll create a documentation task for you.
        🔧 [Calling create_task tool]

        ✅ Created task: "Document MCP Integration"
        - Priority: Medium
        - Status: Pending
        - ID: task_12345

        Would you like me to set a due date or add more details?

You: "Show me all high priority tasks"

Claude: Let me search for your high priority tasks.
        🔧 [Calling search_tasks tool]

        You have 3 high priority tasks:
        1. Review security audit - Due tomorrow
        2. Complete client presentation - Due Friday
        3. Fix production bug - Overdue by 2 days

        Would you like me to help with any of these?
```

### Timeline and Analytics
```
You: "What did I accomplish this week?"

Claude: I'll check your timeline and activities for this week.
        🔧 [Calling get_timeline_items tool]
        🔧 [Calling search_activities tool]

        Here's your week summary:

        📅 **Tasks Completed**: 8 tasks
        📊 **Activities Logged**: 15 activities
        ⏱️ **Total Focus Time**: 32 hours
        🧠 **Memories Added**: 5 entries

        **Key Accomplishments**:
        • Completed MCP integration with Claude Code
        • Finished 3 client projects
        • Updated documentation

        Your productivity was 23% higher than last week!
```

## 🔍 Troubleshooting

### Common Issues

**1. "MCP server failed to start"**
```bash
# Check if tsx is installed
which tsx

# Install if missing
npm install -g tsx

# Verify server works standalone
cd /path/to/zmemory-mcp
npm run dev
```

**2. "Authentication required" errors**
```bash
# Check if ZMemory API is running
curl http://localhost:3001/api/health

# Verify environment variables
echo $OAUTH_CLIENT_SECRET

# Test authentication directly
curl -X POST http://localhost:3000/api/agents/mcp/test \
  -H "Content-Type: application/json" \
  -d '{"toolName": "get_auth_status", "arguments": {}}'
```

**3. "Tools not appearing in Claude Code"**
- Restart Claude Code after configuration changes
- Check that file paths are absolute in configuration
- Verify all required environment variables are set
- Check Claude Code logs for MCP connection errors

**4. "Connection timeout" errors**
- Increase `MCP_SERVER_TIMEOUT` value
- Check if ZMemory API is responsive
- Verify network connectivity

### Debug Mode

Enable detailed logging:

```json
{
  "mcp": {
    "servers": {
      "zmemory": {
        "command": "tsx",
        "args": ["/path/to/zmemory-mcp/src/index.ts"],
        "env": {
          "LOG_LEVEL": "debug",
          "DEBUG": "*"
        }
      }
    }
  }
}
```

### Manual Testing

Test the MCP server independently:

```bash
# Test tool discovery
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | \
  tsx /path/to/zmemory-mcp/src/index.ts

# Test specific tool
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "get_auth_status", "arguments": {}}}' | \
  tsx /path/to/zmemory-mcp/src/index.ts
```

## 🚀 Advanced Configuration

### Multiple Environments

```json
{
  "mcp": {
    "servers": {
      "zmemory-dev": {
        "command": "tsx",
        "args": ["/path/to/zmemory-mcp/src/index.ts"],
        "env": {
          "ZMEMORY_API_URL": "http://localhost:3001",
          "NODE_ENV": "development"
        }
      },
      "zmemory-prod": {
        "command": "node",
        "args": ["/path/to/zmemory-mcp/dist/index.js"],
        "env": {
          "ZMEMORY_API_URL": "https://api.yourproduction.com",
          "NODE_ENV": "production"
        }
      }
    }
  }
}
```

### Performance Optimization

```json
{
  "env": {
    "MCP_SERVER_TIMEOUT": "30000",
    "NODE_OPTIONS": "--max-old-space-size=4096",
    "LOG_LEVEL": "warn"
  }
}
```

## 📚 Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Claude Code MCP Guide](https://docs.anthropic.com/claude/docs)
- [ZephyrOS Documentation](../../../README.md)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)

## 🆘 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review the [main README](./README.md)
3. Open an issue on GitHub
4. Check Claude Code documentation

## 🎉 Success Indicators

You'll know the integration is working when:

- ✅ Claude Code shows "46 tools available"
- ✅ You can run authentication commands
- ✅ Memory and task operations work smoothly
- ✅ Tool calls appear in conversation logs
- ✅ Real data from ZMemory appears in responses

Happy building with Claude Code + ZMemory! 🚀