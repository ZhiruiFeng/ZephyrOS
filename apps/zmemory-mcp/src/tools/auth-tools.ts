import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const authTools: Tool[] = [
  {
    name: 'authenticate',
    description: 'Start OAuth authentication flow to access ZMemory. Use this first before any other operations. Returns authorization URL that user needs to visit. Follow with exchange_code_for_token after user grants access.',
    inputSchema: {
      type: 'object',
      properties: {
        client_id: { type: 'string', description: 'OAuth client ID (typically "zmemory-mcp")' },
        redirect_uri: { type: 'string', description: 'OAuth redirect URI (e.g., "http://localhost:3000/callback")' },
        scope: { type: 'string', description: 'Requested permissions (e.g., "tasks.write,tasks.read")' },
        state: { type: 'string', description: 'Optional state parameter for security' },
      },
      required: ['client_id'],
    },
  },
  {
    name: 'exchange_code_for_token',
    description: 'Exchange authorization code for access token. Use after user completes OAuth flow and provides authorization code. Returns access and refresh tokens for API calls.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Authorization code received from OAuth callback' },
        redirect_uri: { type: 'string', description: 'Same redirect URI used in authentication step' },
        code_verifier: { type: 'string', description: 'PKCE code verifier for security (optional)' },
      },
      required: ['code', 'redirect_uri'],
    },
  },
  {
    name: 'refresh_token',
    description: 'Refresh expired access token using refresh token. Use when access token expires to maintain authentication without re-authorization. Returns new access and refresh tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        refresh_token: { type: 'string', description: 'Valid refresh token from previous authentication' },
      },
      required: ['refresh_token'],
    },
  },
  {
    name: 'get_user_info',
    description: 'Get current authenticated user information. Use to verify which ZMemory account is connected and check user permissions. Returns user profile and account details.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'set_access_token',
    description: 'Manually set access token for API access. Use when you have a valid token from previous session or API key. Alternative to full OAuth flow for testing or direct token usage.',
    inputSchema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'Valid access token or API key for ZMemory access' },
      },
      required: ['access_token'],
    },
  },
  {
    name: 'get_auth_status',
    description: 'Check current authentication status. Use to verify if tokens are valid before making API calls. Returns authentication state and token expiration info.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'clear_auth',
    description: 'Clear authentication tokens and logout. Use when switching accounts or ending session. Removes all stored tokens from memory.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_system_status',
    description: 'Get comprehensive system status for debugging. Shows authentication state, API connectivity, current configuration, and recent errors. Use when troubleshooting issues or verifying system health.',
    inputSchema: {
      type: 'object',
      properties: {
        include_recent_errors: { type: 'boolean', default: true, description: 'Include recent error information in response' },
        check_connectivity: { type: 'boolean', default: true, description: 'Test API connectivity and response time' },
      },
      required: [],
    },
  },
];