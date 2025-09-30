# ZMemory MCP Authentication Scenarios Guide

This guide covers different authentication methods for various use cases when connecting to the ZMemory MCP service.

## Overview

ZMemory MCP supports **two authentication methods**:

1. **OAuth (Google Login)** - Best for interactive user applications
2. **API Keys (zm_...)** - Best for automated agents and scripts

## Authentication Flow Comparison

| Method | Use Case | Setup Complexity | Security | Expiration |
|--------|----------|-----------------|----------|------------|
| **OAuth** | User-facing apps | Medium (one-time setup) | High (user-specific) | Token expires (auto-refresh) |
| **API Key** | Automated agents | Low (copy & paste) | High (can be revoked) | Never expires (until revoked) |

---

## Scenario 1: zflow Web App / iOS App

**Use Case**: Users access their data through your official applications

### Current Status: ✅ **Fully Supported**

**Authentication Method**: OAuth (Google Login)

**How It Works**:
```
User → Google OAuth → Supabase → JWT Token → zflow → MCP → zmemory
```

**Implementation**:
```typescript
// Frontend (already implemented)
// apps/zflow/lib/supabase.ts
const { data } = await supabase.auth.signInWithOAuth({
  provider: 'google'
})

// Token automatically retrieved
const session = await supabase.auth.getSession()
const token = session.data.session?.access_token

// Sent with every request
fetch('/api/agents/messages', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

**Benefits**:
- ✅ No re-authentication needed across devices (same Google account)
- ✅ Secure (user-specific permissions)
- ✅ Token refresh handled automatically by Supabase
- ✅ Works on web and mobile (iOS/Android)

**Next Steps**: ✅ None - Already working perfectly

---

## Scenario 2: Claude Desktop App

**Use Case**: Users want to use MCP tools from Claude Desktop (or other MCP-compatible desktop apps)

### Current Status: ⚠️ **Partially Supported** (OAuth flow needs improvement)

**Recommended Method**: OAuth (with better UX)

**Challenge**: Desktop apps can't easily complete OAuth redirect flow

### Solution A: OAuth with Device Code Flow (Recommended)

**Status**: 🔧 **Needs Implementation**

**How It Would Work**:
```
1. Claude Desktop → Request device code from zmemory
2. zmemory → Return device code + verification URL
3. User → Opens browser, visits URL, logs in with Google
4. zmemory → Polls for authorization
5. zmemory → Returns access token
6. Claude Desktop → Uses token for MCP calls
```

**Implementation Plan**:
```typescript
// New endpoint: /api/oauth/device-code
POST /api/oauth/device-code
Response: {
  device_code: "xxx",
  user_code: "ABCD-1234",
  verification_uri: "https://zmemory.vercel.app/device",
  expires_in: 600
}

// User visits verification_uri in browser, enters user_code
// Desktop app polls: /api/oauth/device-token
POST /api/oauth/device-token
Body: { device_code: "xxx" }
Response: { access_token: "jwt...", refresh_token: "..." }
```

**MCP Configuration** (Claude Desktop):
```json
{
  "mcpServers": {
    "zmemory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-oauth"],
      "env": {
        "MCP_SERVER_URL": "https://zmemory-mcp.vercel.app",
        "OAUTH_DEVICE_CODE_URL": "https://zmemory.vercel.app/api/oauth/device-code",
        "OAUTH_TOKEN_URL": "https://zmemory.vercel.app/api/oauth/device-token"
      }
    }
  }
}
```

**Benefits**:
- ✅ User-friendly (one-time setup)
- ✅ Secure (user-specific permissions)
- ✅ No credentials stored in config files
- ✅ Standard OAuth flow

**Effort**: Medium (2-3 days to implement)

### Solution B: API Key (Alternative - Simpler)

**Status**: ✅ **Supported Now**

**How It Works**:
```
1. User → Logs into zflow web app
2. User → Profile → ZMemory API Keys → Generate Key
3. User → Copies zm_... key
4. User → Pastes into Claude Desktop config
```

**MCP Configuration** (Claude Desktop):
```json
{
  "mcpServers": {
    "zmemory": {
      "command": "node",
      "args": ["/path/to/zmemory-mcp-client.js"],
      "env": {
        "ZMEMORY_API_URL": "https://zmemory.vercel.app",
        "ZMEMORY_AUTH_TOKEN": "zm_6de7ec18bae25a7e9646c7fca53fa3bfa10c936dcd67fb99702fafc545fe1311"
      }
    }
  }
}
```

**Simple Client Script** (`zmemory-mcp-client.js`):
```javascript
#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['server.js'],
  env: {
    ZMEMORY_API_URL: process.env.ZMEMORY_API_URL,
    ZMEMORY_AUTH_TOKEN: process.env.ZMEMORY_AUTH_TOKEN
  }
});

const client = new Client({ name: 'zmemory-desktop', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);
```

**Benefits**:
- ✅ Works immediately (no development needed)
- ✅ Simple configuration
- ✅ No browser interaction needed

**Drawbacks**:
- ⚠️ API key visible in config file (but user controls this file)
- ⚠️ No automatic expiration (must manually revoke)

**Recommendation**: Use API Key now, implement Device Code Flow later for better UX

---

## Scenario 3: Custom Coded Agents (Your Own)

**Use Case**: You build Python/TypeScript agents that run automated tasks

### Current Status: ✅ **Fully Supported**

**Recommended Method**: API Key

**How It Works**:
```python
import anthropic
import requests

# Configuration
ZMEMORY_MCP_URL = "https://zmemory-mcp.vercel.app"
ZMEMORY_API_KEY = "zm_..."  # From zflow Profile page
ANTHROPIC_API_KEY = "sk-ant-..."

# Initialize MCP session
session_response = requests.post(f"{ZMEMORY_MCP_URL}/api/mcp",
    json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "my-agent", "version": "1.0.0"}
        }
    },
    headers={"Accept": "application/json"}
)
session_id = session_response.headers.get("mcp-session-id")

# Set access token (authenticate)
requests.post(f"{ZMEMORY_MCP_URL}/api/mcp",
    json={
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "set_access_token",
            "arguments": {"access_token": ZMEMORY_API_KEY}
        }
    },
    headers={
        "mcp-session-id": session_id,
        "Accept": "application/json"
    }
)

# Now use tools
def search_tasks(keyword):
    response = requests.post(f"{ZMEMORY_MCP_URL}/api/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "search_tasks",
                "arguments": {"keyword": keyword, "status": "in_progress"}
            }
        },
        headers={
            "mcp-session-id": session_id,
            "Accept": "application/json"
        }
    )
    return response.json()

# Use with Claude
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    tools=[...],  # MCP tools converted to Claude format
    messages=[{"role": "user", "content": "What tasks do I have?"}]
)
```

**Benefits**:
- ✅ Simple to implement
- ✅ No OAuth flow complexity
- ✅ API key stored securely in environment variables
- ✅ Works in CI/CD pipelines

**Security Best Practices**:
```bash
# Store in environment variables (not in code)
export ZMEMORY_API_KEY="zm_..."

# Or use secrets manager
# AWS: aws secretsmanager get-secret-value --secret-id zmemory-api-key
# Vercel: process.env.ZMEMORY_API_KEY
```

**Next Steps**: ✅ None - Use the Jupyter notebook examples as reference

---

## Scenario 4: Third-Party No-Code Agent Platforms

**Use Case**: Users want to connect ZMemory to platforms like Zapier, Make.com, n8n, Langflow, etc.

### Current Status: ✅ **Supported** (with API Key)

**Recommended Method**: API Key

**Examples**:

### Zapier Integration
```
1. Create Zap
2. Add "Webhooks by Zapier" action
3. Configure:
   URL: https://zmemory-mcp.vercel.app/api/mcp
   Method: POST
   Headers:
     - mcp-session-id: <session-id>
     - Accept: application/json
   Body:
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "create_task",
         "arguments": {
           "title": "{{trigger.title}}",
           "description": "{{trigger.description}}"
         }
       }
     }
```

### n8n Workflow
```json
{
  "nodes": [
    {
      "name": "ZMemory MCP",
      "type": "n8n-nodes-base.httpRequest",
      "credentials": {
        "httpHeaderAuth": {
          "name": "ZMemory Auth",
          "data": {
            "name": "mcp-session-id",
            "value": "={{$env.ZMEMORY_SESSION_ID}}"
          }
        }
      },
      "parameters": {
        "url": "https://zmemory-mcp.vercel.app/api/mcp",
        "method": "POST",
        "body": {
          "jsonrpc": "2.0",
          "id": 1,
          "method": "tools/call",
          "params": {
            "name": "search_tasks",
            "arguments": {
              "keyword": "{{$json.keyword}}"
            }
          }
        }
      }
    }
  ]
}
```

### Langflow Integration
Create custom component:
```python
from langflow import CustomComponent
import requests

class ZMemoryMCP(CustomComponent):
    def build(self, api_key: str, tool_name: str, arguments: dict):
        # Initialize session
        session_response = requests.post(
            "https://zmemory-mcp.vercel.app/api/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {...}
            }
        )
        session_id = session_response.headers["mcp-session-id"]

        # Set token
        requests.post(
            "https://zmemory-mcp.vercel.app/api/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "set_access_token",
                    "arguments": {"access_token": api_key}
                }
            },
            headers={"mcp-session-id": session_id}
        )

        # Call tool
        response = requests.post(
            "https://zmemory-mcp.vercel.app/api/mcp",
            json={
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": arguments
                }
            },
            headers={"mcp-session-id": session_id}
        )

        return response.json()
```

**Recommendation**: API Key (simpler for users to configure)

**Alternative**: OAuth could work but requires users to:
1. Complete OAuth flow in browser
2. Copy access token
3. Paste into platform

API key is much simpler: just copy/paste once.

---

## Scenario 5: Scheduled Agent for AI Task Processing

**Use Case**: Background agent that polls for AI tasks and processes them automatically

### Current Status: ✅ **Fully Supported**

**Recommended Method**: API Key

**Implementation Example**:

```python
#!/usr/bin/env python3
"""
Scheduled AI Task Processor
Runs every 5 minutes, processes pending AI tasks
"""

import os
import time
import requests
from anthropic import Anthropic

# Configuration
ZMEMORY_MCP_URL = "https://zmemory-mcp.vercel.app"
ZMEMORY_API_KEY = os.environ["ZMEMORY_API_KEY"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

class MCPClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.session_id = None
        self.request_id = 0
        self._initialize()

    def _initialize(self):
        """Initialize MCP session"""
        response = requests.post(f"{ZMEMORY_MCP_URL}/api/mcp",
            json={
                "jsonrpc": "2.0",
                "id": self._next_id(),
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {"name": "task-processor", "version": "1.0.0"}
                }
            },
            headers={"Accept": "application/json"}
        )
        self.session_id = response.headers.get("mcp-session-id")

        # Authenticate
        self.call_tool("set_access_token", {"access_token": self.api_key})

    def _next_id(self):
        self.request_id += 1
        return self.request_id

    def call_tool(self, name, arguments):
        """Call MCP tool"""
        response = requests.post(f"{ZMEMORY_MCP_URL}/api/mcp",
            json={
                "jsonrpc": "2.0",
                "id": self._next_id(),
                "method": "tools/call",
                "params": {"name": name, "arguments": arguments}
            },
            headers={
                "mcp-session-id": self.session_id,
                "Accept": "application/json"
            }
        )
        return response.json()

def process_pending_tasks():
    """Main processing loop"""
    mcp = MCPClient(ZMEMORY_API_KEY)
    claude = Anthropic(api_key=ANTHROPIC_API_KEY)

    while True:
        # Get pending AI tasks
        result = mcp.call_tool("get_ai_tasks", {
            "status": "pending",
            "limit": 10
        })

        tasks = result.get("result", {}).get("content", [])

        for task_data in tasks:
            task = parse_task(task_data)
            task_id = task["id"]

            print(f"Processing task {task_id}: {task['title']}")

            # Accept task
            mcp.call_tool("accept_ai_task", {
                "task_id": task_id,
                "estimated_duration": 300  # 5 minutes
            })

            try:
                # Process with Claude
                response = claude.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=4096,
                    messages=[{
                        "role": "user",
                        "content": f"Task: {task['description']}\n\nPlease complete this task."
                    }]
                )

                result_text = response.content[0].text

                # Mark complete
                mcp.call_tool("complete_ai_task", {
                    "task_id": task_id,
                    "result": result_text
                })

                print(f"✅ Completed task {task_id}")

            except Exception as e:
                # Mark failed
                mcp.call_tool("fail_ai_task", {
                    "task_id": task_id,
                    "error": str(e)
                })

                print(f"❌ Failed task {task_id}: {e}")

        # Wait 5 minutes
        time.sleep(300)

def parse_task(task_data):
    """Parse task from MCP response"""
    import json
    if isinstance(task_data, dict) and task_data.get("type") == "text":
        return json.loads(task_data["text"])
    return task_data

if __name__ == "__main__":
    print("🤖 Starting AI Task Processor...")
    process_pending_tasks()
```

**Deployment Options**:

### Option A: GitHub Actions (Scheduled)
```yaml
# .github/workflows/process-tasks.yml
name: Process AI Tasks
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install anthropic requests
      - run: python task_processor.py
        env:
          ZMEMORY_API_KEY: ${{ secrets.ZMEMORY_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Option B: Vercel Cron
```typescript
// pages/api/cron/process-tasks.ts
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Process tasks
  await processPendingTasks();

  res.status(200).json({ success: true });
}
```

```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/process-tasks",
    "schedule": "*/5 * * * *"
  }]
}
```

### Option C: Docker Container (Always Running)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY task_processor.py .
CMD ["python", "task_processor.py"]
```

```bash
# Run with Docker Compose
docker-compose up -d

# Or Kubernetes CronJob
kubectl apply -f cronjob.yaml
```

**Recommendation**:
- **Local Dev**: Run script directly (`python task_processor.py`)
- **Production**: GitHub Actions or Vercel Cron (free, reliable)

---

## Other Common Scenarios

### Scenario 6: Personal AI Assistant (Voice)

**Use Case**: Siri/Alexa/Google Assistant integration

**Recommended Method**: API Key
- User generates key once
- Stored in assistant's backend
- Works offline (no OAuth redirect needed)

### Scenario 7: Browser Extension

**Use Case**: Chrome/Firefox extension for quick task capture

**Recommended Method**: OAuth (preferred) or API Key (fallback)

**OAuth Flow**:
```javascript
// Extension background script
chrome.identity.launchWebAuthFlow({
  url: 'https://zmemory.vercel.app/oauth/authorize?...',
  interactive: true
}, (redirectUrl) => {
  const token = extractToken(redirectUrl);
  chrome.storage.local.set({ zmemory_token: token });
});
```

**API Key Flow**:
```javascript
// Extension popup
const apiKey = prompt('Enter your ZMemory API Key:');
chrome.storage.local.set({ zmemory_api_key: apiKey });
```

### Scenario 8: IDE Plugin (VSCode/JetBrains)

**Use Case**: Track coding sessions as activities

**Recommended Method**: API Key
- Simple configuration
- No browser interaction
- Stored in IDE settings

```json
// .vscode/settings.json
{
  "zmemory.apiKey": "zm_...",
  "zmemory.trackCodingTime": true
}
```

### Scenario 9: Slack Bot

**Use Case**: Team members interact with their ZMemory via Slack

**Recommended Method**: OAuth (per-user)

**Flow**:
```
1. User → /zmemory connect
2. Bot → Sends OAuth link
3. User → Clicks, logs in with Google
4. Bot → Stores token per Slack user ID
5. User → /zmemory tasks
6. Bot → Uses stored token to fetch tasks
```

### Scenario 10: Public API (Read-Only Sharing)

**Use Case**: Share read-only access to specific data

**Recommended Method**: Scoped API Key

**Future Enhancement** (not yet implemented):
```typescript
// Generate read-only API key with specific scopes
const apiKey = await generateApiKey({
  scopes: ['tasks:read', 'memories:read'],
  expiresIn: '30d'
})
// Returns: zm_readonly_...
```

---

## Security Comparison

| Scenario | OAuth | API Key | Security Level |
|----------|-------|---------|----------------|
| Web/Mobile App | ✅ Best | ❌ Not recommended | High |
| Desktop App | ✅ Good (Device Code) | ✅ Good | High |
| Coded Agents | ⚠️ Complex | ✅ Best | High |
| No-Code Platforms | ⚠️ Complex | ✅ Best | Medium-High |
| Scheduled Jobs | ❌ Difficult | ✅ Best | High |
| Browser Extension | ✅ Best | ✅ Good (fallback) | High |
| IDE Plugin | ⚠️ Complex | ✅ Best | High |
| Slack Bot | ✅ Best | ⚠️ One key for all | High |
| Public Sharing | N/A | ✅ Scoped keys | Medium |

---

## Implementation Roadmap

### ✅ Already Implemented
- [x] OAuth for web/mobile apps
- [x] API Key generation and authentication
- [x] MCP session management
- [x] Automatic token passing in zflow

### 🔧 Recommended Next Steps

#### Priority 1: Device Code Flow (for Desktop Apps)
**Effort**: 2-3 days
**Impact**: High (better Claude Desktop UX)

**Tasks**:
1. Create `/api/oauth/device-code` endpoint
2. Create `/api/oauth/device-token` polling endpoint
3. Create `/device` verification page (user enters code)
4. Add device code support to MCP client
5. Document Claude Desktop setup

#### Priority 2: API Key Scopes (for Sharing)
**Effort**: 3-4 days
**Impact**: Medium (enables read-only sharing)

**Tasks**:
1. Add `scopes` column to `zmemory_api_keys` table
2. Implement scope validation in auth middleware
3. Update API key generation UI (select scopes)
4. Add RLS policies for scoped access
5. Document scope usage

#### Priority 3: Token Refresh Endpoint
**Effort**: 1 day
**Impact**: Medium (long-running agents don't break)

**Tasks**:
1. Create `/api/oauth/refresh` endpoint
2. Return new access token from refresh token
3. Update MCP client to handle token refresh
4. Document refresh flow

### 📋 Nice to Have

- [ ] Webhook support (notify external services)
- [ ] Rate limiting per API key
- [ ] Usage analytics (API calls per key)
- [ ] API key expiration (auto-rotate)
- [ ] Multiple API keys per user (dev/prod)

---

## Quick Reference

### When to Use OAuth
- ✅ User-facing applications (web, mobile, desktop)
- ✅ Multi-user systems (each user has own data)
- ✅ When security is paramount
- ✅ When you want automatic token refresh

### When to Use API Key
- ✅ Automated scripts and agents
- ✅ Server-to-server communication
- ✅ CI/CD pipelines
- ✅ Single-user systems
- ✅ When OAuth is too complex

### How to Get API Key
```
1. Visit zflow web app
2. Log in with Google
3. Navigate to Profile → ZMemory API Keys
4. Click "Generate New Key"
5. Copy the zm_... key (shown only once)
6. Store securely in environment variables
```

### How to Use API Key with MCP
```bash
# 1. Initialize session
curl -X POST https://zmemory-mcp.vercel.app/api/mcp \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'

# 2. Extract session ID from response headers
SESSION_ID="<mcp-session-id-from-response>"

# 3. Set access token
curl -X POST https://zmemory-mcp.vercel.app/api/mcp \
  -H "Accept: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "set_access_token",
      "arguments": {"access_token": "zm_..."}
    }
  }'

# 4. Use tools
curl -X POST https://zmemory-mcp.vercel.app/api/mcp \
  -H "Accept: application/json" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_tasks",
      "arguments": {"keyword": "urgent", "status": "in_progress"}
    }
  }'
```

---

## Support & Resources

- **Documentation**: `apps/zmemory-mcp/INTEGRATION_GUIDE.md`
- **Examples**: `MCP_JUPYTER_TESTING.ipynb`
- **API Reference**: [MCP Specification](https://modelcontextprotocol.io)

---

**Last Updated**: 2025-09-30
**Version**: 1.0.0
