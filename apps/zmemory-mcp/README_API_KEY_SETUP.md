# ZMemory MCP API Key Setup Guide

This guide explains how to set up ZMemory MCP with API key authentication instead of OAuth, providing a seamless experience for Claude Code integration.

## Why API Keys?

API keys provide several advantages over OAuth for automated/agent usage:

- **Long-lived**: No need to re-authenticate frequently
- **Simple**: No browser-based OAuth flow required
- **Secure**: Scoped permissions and revokable access
- **Automated**: Perfect for CI/CD and agent integrations

## Setup Steps

### 1. Generate Your ZMemory API Key

1. **Open ZFlow**: Navigate to http://localhost:3000
2. **Go to Profile**: Click your profile in the top-right
3. **API Keys Section**: Find the "API Keys" module
4. **Add ZMemory Key**:
   - Click "Add Key"
   - Select "ZMemory" as vendor
   - Choose "ZMemory MCP" service (optional)
   - Enter name: "Claude MCP Key"
   - Select scopes you need:
     - `tasks.read`, `tasks.write` - For task management
     - `memories.read`, `memories.write` - For memory operations
     - `activities.read`, `activities.write` - For activity tracking
     - `ai_tasks.read`, `ai_tasks.write` - For AI task management
5. **Copy the API Key**: Save it securely (shown only once!)

### 2. Configure Claude Desktop

Choose one of these methods:

#### Method A: Update Existing Configuration

If you already have a Claude Desktop configuration:

```json
{
  "mcpServers": {
    "zmemory-mcp": {
      "command": "node",
      "args": ["/path/to/ZephyrOS/apps/zmemory-mcp/src/index.js"],
      "env": {
        "ZMEMORY_API_URL": "http://localhost:3001",
        "ZMEMORY_API_KEY": "zm_your_generated_api_key_here"
      }
    }
  }
}
```

#### Method B: Use Pre-configured Template

```bash
# Copy the API key template
cp /path/to/ZephyrOS/apps/zmemory-mcp/configs/claude-desktop-config-api-key.json ~/.config/Claude/claude_desktop_config.json

# Edit the file and replace REPLACE_WITH_YOUR_ZMEMORY_API_KEY with your actual key
```

### 3. Environment Variables (Alternative)

You can also set the API key as an environment variable:

```bash
export ZMEMORY_API_KEY="zm_your_generated_api_key_here"
```

### 4. Restart Claude Desktop

After configuration, restart Claude Desktop to pick up the new settings.

## Verification

Once configured, you can test the connection:

1. **Open Claude Code**
2. **Use MCP Tools**: Try commands like:
   - "Show me my current tasks"
   - "Create a new task called 'Test API Key'"
   - "Search my memories for 'project'"

3. **Check API Key Usage**: In ZFlow > Profile > API Keys, you should see:
   - Last used timestamp updated
   - Usage statistics

## Troubleshooting

### Common Issues

1. **"Unauthorized" Error**
   - Verify API key is correct
   - Check that API key hasn't expired
   - Ensure API key has required scopes

2. **"Connection Failed"**
   - Verify ZMEMORY_API_URL is correct
   - Ensure ZMemory server is running on port 3001
   - Check network connectivity

3. **"Insufficient Permissions"**
   - Review API key scopes
   - Regenerate key with broader permissions if needed

### Debug Mode

Enable debug logging:

```bash
export DEBUG=zmemory:*
```

Then restart Claude Desktop to see detailed logs.

## Security Best Practices

1. **Scope Limitation**: Only grant necessary scopes
2. **Key Rotation**: Regularly rotate API keys
3. **Secure Storage**: Never commit API keys to git
4. **Expiration**: Set expiration dates for API keys
5. **Monitoring**: Review API key usage regularly

## Scopes Reference

| Scope | Description |
|-------|-------------|
| `tasks.read` | Read tasks and task data |
| `tasks.write` | Create, update, delete tasks |
| `tasks.time` | Track time for tasks |
| `memories.read` | Read memories and memory data |
| `memories.write` | Create, update, delete memories |
| `activities.read` | Read activities and activity data |
| `activities.write` | Create, update, delete activities |
| `timeline.read` | Read timeline data and insights |
| `timeline.write` | Create timeline entries |
| `ai_tasks.read` | Read AI tasks and their status |
| `ai_tasks.write` | Create, update, manage AI tasks |
| `categories.read` | Read task categories |
| `categories.write` | Create and manage task categories |

## Migration from OAuth

If you're currently using OAuth and want to switch to API keys:

1. **Generate API Key** (as described above)
2. **Update Configuration** to use `ZMEMORY_API_KEY` instead of OAuth settings
3. **Remove OAuth Settings**: Remove `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, etc.
4. **Restart Claude Desktop**

The transition is seamless - no data loss or re-setup required!