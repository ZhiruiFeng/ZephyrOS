# Production MCP Setup Guide

This guide explains how to configure the MCP (Model Context Protocol) services for production deployment on Vercel.

## 🚀 Environment Variables

Add these environment variables to your Vercel deployment:

### Required for Production MCP

```bash
# Core Application
NODE_ENV=production
VERCEL=1

# MCP Configuration
MCP_HTTP_URL=https://your-zmemory-mcp-app.vercel.app
ZMEMORY_API_URL=https://your-zmemory-mcp-app.vercel.app
ZMEMORY_API_KEY=your-production-api-key

# OAuth Configuration
OAUTH_CLIENT_ID=zmemory-mcp-prod
OAUTH_CLIENT_SECRET=your-production-oauth-secret
OAUTH_REDIRECT_URI=https://your-zmemory-mcp-app.vercel.app/oauth/callback
OAUTH_SCOPE=tasks.write,tasks.read

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-supabase-service-key

# OpenAI (if using)
OPENAI_API_KEY=your-production-openai-key

# Anthropic (if using)
ANTHROPIC_API_KEY=your-production-anthropic-key

# Redis (if available in production)
REDIS_URL=your-production-redis-url
```

## 🔧 MCP Service Architecture

In production, the system automatically switches from local MCP processes to HTTP-based communication:

- **Development**: Uses local `zmemory-mcp` process via stdio
- **Production**: Uses HTTP client to connect to deployed MCP service

## 📋 Setup Steps

### 1. Deploy ZMemory MCP Service

First, ensure your `zmemory-mcp` service is deployed and accessible:

```bash
# Example Vercel deployment URL
https://your-zmemory-mcp-app.vercel.app
```

### 2. Configure Environment Variables

Set the following in your Vercel dashboard or via CLI:

```bash
vercel env add MCP_HTTP_URL
# Enter: https://your-zmemory-mcp-app.vercel.app

vercel env add ZMEMORY_API_URL
# Enter: https://your-zmemory-mcp-app.vercel.app

vercel env add ZMEMORY_API_KEY
# Enter: your-api-key

vercel env add OAUTH_CLIENT_SECRET
# Enter: your-oauth-secret
```

### 3. Update MCP Service Endpoints

Your deployed MCP service should expose these endpoints:

- `GET /health` - Health check
- `GET /mcp/tools` - List available tools
- `POST /mcp/call` - Execute tool calls

### 4. Verify Configuration

The system will automatically:

1. Detect production environment (`NODE_ENV=production` or `VERCEL=1`)
2. Use HTTP MCP client instead of stdio
3. Connect to your deployed MCP service
4. Display connection status in the MCP Status Indicator

## 🔍 HTTP MCP Client Features

The production HTTP client provides:

- **Health checks** before connection
- **Tool discovery** via `/mcp/tools` endpoint
- **Tool execution** via `/mcp/call` endpoint
- **Authentication** via Bearer tokens
- **Timeout handling** (15 seconds default)
- **Error recovery** and fallback tools

## 📊 MCP Status Visualization

The enhanced MCP Status Indicator shows:

- ✅ **Connection status** (Online/Offline)
- 🔧 **Available tools** count
- 🔌 **Service providers** (OpenAI, Anthropic)
- 📋 **Tool categories** (Memory, Tasks, etc.)
- 🚀 **System agents** available

## 🛠️ Troubleshooting

### Common Issues

1. **MCP Unavailable**
   - Check `MCP_HTTP_URL` is correctly set
   - Verify the MCP service is deployed and accessible
   - Check network connectivity

2. **Authentication Errors**
   - Verify `ZMEMORY_API_KEY` is set
   - Check OAuth configuration
   - Ensure API keys are valid

3. **Tool Loading Issues**
   - Check MCP service `/mcp/tools` endpoint
   - Verify service is returning proper tool schemas
   - Check console logs for detailed errors

### Debugging

Enable debug logging by setting:

```bash
DEBUG=mcp:*
```

This will log:
- Connection attempts
- Tool discovery
- API calls
- Error details

## 🔄 Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| MCP Client | Local stdio process | HTTP client |
| Connection | `tsx zmemory-mcp/src/index.ts` | `https://mcp-service.vercel.app` |
| Tools | Loaded via process communication | Loaded via HTTP API |
| Authentication | Local OAuth | Production OAuth |
| Debugging | Full process logs | HTTP request/response logs |

## 📱 Mobile Support

The MCP Status Indicator is fully responsive:

- **Compact view** on mobile with essential info
- **Expandable overlay** for detailed status
- **Touch-friendly** interactions
- **Auto-refresh** every 30 seconds

## 🎯 Next Steps

1. Deploy your `zmemory-mcp` service to Vercel
2. Set the production environment variables
3. Deploy your ZFlow application
4. Verify MCP integration in the agents page
5. Monitor the MCP Status Indicator for health

The system will automatically handle the production configuration and provide a seamless experience for your users.