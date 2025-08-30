# ZMemory MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that exposes ZMemory's memory management functionality to AI agents.

## 🎯 Features

- **Memory Management**: Complete CRUD operations for memories, tasks, and notes
- **OAuth 2.0 Authentication**: Secure user authentication with token management
- **Vercel Deployment**: Ready for serverless deployment
- **MCP Protocol Compliance**: Compatible with all MCP-supporting AI tools
- **TypeScript Support**: Full type safety and IntelliSense

## 🚀 Quick Start

### 1. Installation & Build

```bash
npm install
npm run build
```

### 2. Environment Configuration

Create `.env` file:

```bash
# ZMemory API Configuration
ZMEMORY_API_URL=https://your-zmemory-api.vercel.app
OAUTH_CLIENT_ID=zmemory-mcp
OAUTH_CLIENT_SECRET=your-generated-secret-here
OAUTH_REDIRECT_URI=http://localhost:3000/callback
OAUTH_SCOPE=tasks.write
ZMEMORY_TIMEOUT=10000
```

### 3. OAuth Setup

Generate OAuth configuration:

```bash
# Development environment
npm run generate:oauth

# Production environment
npm run generate:custom https://your-api-domain.com
```

Update your ZMemory API's `.env` file:

```bash
OAUTH_CLIENTS='[
  {
    "client_id": "zmemory-mcp",
    "client_secret": "your-generated-secret-here",
    "redirect_uris": ["http://localhost:3000/callback"],
    "scopes": ["tasks.write", "tasks.read"]
  }
]'
```

### 4. Claude Desktop Integration

#### Automatic Setup
```bash
npm run setup:claude YOUR_CLIENT_SECRET_HERE
```

#### Manual Setup
Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "zmemory": {
      "command": "node",
      "args": ["/path/to/zmemory-mcp/dist/index.js"],
      "env": {
        "ZMEMORY_API_URL": "https://your-zmemory-api.vercel.app",
        "OAUTH_CLIENT_ID": "zmemory-mcp",
        "OAUTH_CLIENT_SECRET": "your-secret-here",
        "OAUTH_REDIRECT_URI": "http://localhost:3000/callback",
        "OAUTH_SCOPE": "tasks.write"
      }
    }
  }
}
```

## 🌐 Vercel Deployment

### Deploy via Vercel Dashboard

1. **Import Project**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Set **Root Directory**: `apps/zmemory-mcp`
   - Set **Framework Preset**: `Other`

2. **Configure Build Settings**:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Environment Variables**:
   ```
   ZMEMORY_API_URL=https://your-zmemory-api.vercel.app
   OAUTH_CLIENT_ID=zmemory-mcp
   OAUTH_CLIENT_SECRET=your_secret_here
   OAUTH_REDIRECT_URI=http://localhost:3000/callback
   OAUTH_SCOPE=tasks.write
   ZMEMORY_TIMEOUT=10000
   ```

4. **Deploy and Test**:
   ```bash
   # Health check
   curl https://your-deployment-url.vercel.app/api/mcp
   
   # Test MCP tools
   curl -X POST https://your-deployment-url.vercel.app/api/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'
   ```

### Deploy via CLI

```bash
cd apps/zmemory-mcp
npx vercel --prod
```

## 🔧 Available MCP Tools

### Authentication Tools
- `authenticate` - Start OAuth flow
- `exchange_code_for_token` - Exchange authorization code for tokens
- `refresh_token` - Refresh access token
- `get_auth_status` - Check authentication status
- `set_access_token` - Manually set access token
- `get_user_info` - Get current user info
- `clear_auth` - Clear authentication

### Memory Management Tools
- `add_memory` - Create new memory/task/note
- `search_memories` - Search and filter memories
- `get_memory` - Get specific memory details
- `update_memory` - Update existing memory
- `delete_memory` - Delete memory
- `get_memory_stats` - Get usage statistics

## 💬 Usage Examples

### Basic Authentication Flow

1. **Start authentication**:
   ```
   Please help me start ZMemory OAuth authentication
   ```

2. **Complete authentication**:
   ```
   Please use authorization code "abc123" to complete authentication
   ```

3. **Check status**:
   ```
   Please check my ZMemory authentication status
   ```

### Memory Management

```
Please add a task: "Complete project documentation" with high priority
Please search for all high-priority tasks
Please update task status to "in progress"
Please show my memory statistics
```

## 🧪 Testing

```bash
# Test OAuth functionality
npm run test:oauth

# Test MCP functionality  
npm run test:mcp

# Type checking
npm run type-check
```

## 🔒 Security Notes

- Store client secrets securely
- Use HTTPS in production
- Tokens are stored in memory only
- Configure appropriate OAuth scopes
- Never commit secrets to version control

## 📂 Project Structure

```
apps/zmemory-mcp/
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # MCP server implementation
│   ├── zmemory-client.ts  # ZMemory API client
│   └── types.ts           # Type definitions
├── api/
│   └── mcp.js             # Vercel API function
├── scripts/               # Utility scripts
├── dist/                  # Build output
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies & scripts
```

## 🛠️ Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Debug mode
DEBUG=* npm run dev
```

## 📄 License

MIT License

## 🔗 Resources

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)