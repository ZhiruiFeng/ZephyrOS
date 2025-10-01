import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const authTools: Tool[] = [
  {
    name: 'authenticate',
    description: 'Start OAuth 2.0 authentication flow to access ZMemory API. Use this FIRST before any other operations if not using API key. Returns authorization URL that user needs to visit in browser. After user grants access, follow with exchange_code_for_token to get tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'OAuth client ID (typically "zmemory-mcp" or provided by ZMemory admin)' },
        redirect_uri: { type: 'string', description: 'OAuth redirect URI where auth code will be sent (e.g., "http://localhost:3000/callback")' },
        scope: { type: 'string', description: 'Requested permissions scope (e.g., "tasks.write,tasks.read,memories.read")' },
        state: { type: 'string', description: 'Optional CSRF protection state parameter (random string to verify callback)' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'exchange_code_for_token',
    description: 'Exchange OAuth authorization code for access and refresh tokens. Use after user completes OAuth flow at authorization URL and provides the callback code. Stores tokens in client for subsequent API calls. Returns access_token and refresh_token.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Authorization code received from OAuth callback URL (one-time use)' },
        redirect_uri: { type: 'string', description: 'Same redirect_uri used in authenticate step (must match exactly)' },
        code_verifier: { type: 'string', description: 'PKCE code verifier for enhanced security (optional, required if PKCE was used)' },
      },
      required: ['code', 'redirect_uri'],
    },
  },
  {
    name: 'refresh_token',
    description: 'Refresh expired access token using refresh token. Use when access token expires (typically after 1 hour) to maintain authentication without re-authorization. Returns new access_token and refresh_token pair.',
    inputSchema: {
      type: 'object',
      properties: {
        refresh_token: { type: 'string', description: 'Valid refresh token from previous authentication or token exchange' },
      },
      required: ['refresh_token'],
    },
  },
  {
    name: 'get_user_info',
    description: 'Get current authenticated user information. Use to verify which ZMemory account is connected, check user UUID, and validate permissions. Returns user profile including email, name, and account details. Requires valid access token.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'set_access_token',
    description: 'Manually set access token or API key for direct API access. Use when you have a valid token from previous session, persistent storage, or ZMemory API key. Alternative to full OAuth flow for testing, scripting, or direct token usage. Bypasses OAuth workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'Valid access token or API key for ZMemory API (long-lived API keys preferred for automation)' },
      },
      required: ['access_token'],
    },
  },
  {
    name: 'get_auth_status',
    description: 'Check current authentication status and token validity. Use to verify if client is authenticated before making API calls, check token expiration, and validate session state. Returns isAuthenticated boolean and token metadata.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'clear_auth',
    description: 'Clear authentication tokens and logout from ZMemory API. Use when switching accounts, ending session, or testing re-authentication. Removes all stored access and refresh tokens from client memory. Does not revoke tokens on server.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_system_status',
    description: 'Get comprehensive system status for debugging and health checks. Shows authentication state, API connectivity, base URL configuration, client version, and recent errors. Use when troubleshooting connection issues, verifying setup, or checking system health.',
    inputSchema: {
      type: 'object',
      properties: {
        include_recent_errors: { type: 'boolean', default: true, description: 'Include recent error log in response (helpful for debugging)' },
        check_connectivity: { type: 'boolean', default: true, description: 'Test API connectivity with ping and measure response time' },
      },
      required: [],
    },
  },
];
