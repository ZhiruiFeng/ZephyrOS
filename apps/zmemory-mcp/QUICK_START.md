# 🚀 ZMemory MCP Quick Start

> Security note
> - Do not paste real secrets into this guide. Use placeholders and environment variables.
> - CI will scan for secrets on push/PR; rotate any exposed secrets immediately.

## 30-Second Setup for Claude Code

### 1. Prerequisites
```bash
# Install tsx globally
npm install -g tsx

# Build MCP server
cd /path/to/zmemory-mcp
npm run build
```

### 2. Claude Code Configuration

Add this to your Claude Code MCP settings:

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
"OAUTH_CLIENT_SECRET": "{{OAUTH_CLIENT_SECRET}}"
        }
      }
    }
  }
}
```

### 3. Start Services
```bash
# Terminal 1: ZMemory API
cd ../zmemory-api && npm run dev

# Terminal 2: (Optional) ZFlow
cd ../zflow && npm run dev
```

### 4. Test in Claude Code
```
"What ZMemory tools are available?"
"Check my authentication status"
"Search my memories about programming"
"Create a task: Test MCP integration"
```

## ✅ Success Indicators

- **Claude Code shows**: "46 tools available from zmemory server"
- **Authentication works**: Commands return auth status
- **Tools respond**: Memory/task operations return data
- **Real data**: Actual content from your ZMemory database

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "MCP server failed to start" | Check if `tsx` is installed: `npm install -g tsx` |
| "Authentication required" | Verify ZMemory API is running on port 3001 |
| "Tools not appearing" | Restart Claude Code after configuration |
| "Connection timeout" | Increase timeout in env: `"MCP_SERVER_TIMEOUT": "30000"` |

## 📚 Full Documentation

- **Complete Guide**: [CLAUDE_CODE_INTEGRATION.md](./CLAUDE_CODE_INTEGRATION.md)
- **Tool Reference**: [README.md](./README.md)
- **ZFlow Integration**: [../zflow/app/lib/agents/](../zflow/app/lib/agents/)

## 🔧 Available Tool Categories

- 🔐 **Authentication** (7 tools): OAuth, tokens, user info
- 🧠 **Memory Management** (6 tools): CRUD operations for memories
- ✅ **Task Management** (11 tools): Tasks, timers, analytics
- 📊 **Activity Tracking** (4 tools): Activities, mood, energy
- 📅 **Timeline & Search** (4 tools): Unified timeline, insights
- 🏷️ **Categories** (4 tools): Organization and tagging
- 🤖 **AI Tasks** (10 tools): Agent task management

**Total: 46 tools** for complete ZephyrOS integration!