import { randomUUID } from 'node:crypto';
import { ZMemoryMCPServer } from '../dist/server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

// In-memory session store (best-effort in serverless; sessions may be evicted on cold start)
const sessions = new Map(); // sessionId -> { transport, server }

// CORS headers for browser/Electron MCP clients
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-session-id',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

function getConfigFromEnv() {
  return {
    apiUrl: process.env.ZMEMORY_API_URL || 'http://localhost:3001',
    apiKey: process.env.ZMEMORY_API_KEY,
    timeout: process.env.ZMEMORY_TIMEOUT ? parseInt(process.env.ZMEMORY_TIMEOUT) : 10000,
    oauth: {
      clientId: process.env.OAUTH_CLIENT_ID || 'zmemory-mcp',
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/callback',
      scope: process.env.OAUTH_SCOPE || 'tasks.write',
    },
  };
}

function ensureCors(req, res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
  // Handle OPTIONS preflight quickly
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

async function getOrCreateSession(req, res) {
  const sessionId = req.headers['mcp-session-id'];
  if (typeof sessionId === 'string' && sessions.has(sessionId)) {
    return { id: sessionId, ...sessions.get(sessionId) };
  }

  // Only allow creating a new session on initialize requests (no session header)
  const body = req.body;
  if (!sessionId && body && isInitializeRequest(body)) {
    let server;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        // Store mapping once initialized
        sessions.set(id, { transport, server });
      },
      // For remote deployments, leave DNS rebinding protection disabled unless you set allowedHosts/origins
      enableDnsRebindingProtection: false,
      // Prefer JSON responses on POST to avoid long-lived SSE on platforms with short timeouts
      enableJsonResponse: true,
    });

    server = new ZMemoryMCPServer(getConfigFromEnv()).getServer();
    await server.connect(transport);
    // The actual sessionId will be assigned during initialize; client reads it from response header
    return { id: undefined, transport, server };
  }

  // Invalid: non-initialize without session
  res.status(400).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
    id: null,
  });
  return null;
}

// Vercel function handler implementing MCP Streamable HTTP transport
export default async function handler(req, res) {
  // Add CORS / preflight
  if (ensureCors(req, res)) return;

  try {
    // Health check: allow simple GET without SSE Accept header
    if (
      req.method === 'GET' &&
      (!req.headers.accept || !req.headers.accept.includes('text/event-stream'))
    ) {
      res.status(200).json({
        status: 'healthy',
        service: 'zmemory-mcp',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
      return;
    }

    // DELETE requests require an existing session; on success, we cleanup our store
    if (req.method === 'DELETE') {
      const sessionId = req.headers['mcp-session-id'];
      if (!sessionId || Array.isArray(sessionId) || !sessions.has(sessionId)) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: Invalid or missing Mcp-Session-Id' },
          id: null,
        });
        return;
      }
      const { transport } = sessions.get(sessionId);
      await transport.handleRequest(req, res);
      // Best-effort cleanup (transport.onclose will also clear internally)
      sessions.delete(sessionId);
      return;
    }

    // For POST/GET (SSE) routed by transport
    if (req.method === 'POST' || req.method === 'GET') {
      const session = await getOrCreateSession(req, res);
      if (!session) return; // Error already sent
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // Method not allowed
    res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    });
  } catch (error) {
    console.error('MCP API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        },
        id: null,
      });
    }
  }
}
