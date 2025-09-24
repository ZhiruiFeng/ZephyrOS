import { ZMemoryClient } from '../zmemory-client.js';
import { AuthenticateParamsSchema } from '../types.js';

export class AuthHandlers {
  constructor(private zmemoryClient: ZMemoryClient) {}

  async handleAuthenticate(args: any) {
    const params = AuthenticateParamsSchema.parse(args);
    const result = await this.zmemoryClient.authenticate(params);

    return {
      content: [
        {
          type: 'text',
          text: `请访问以下URL进行认证:\n${result.authUrl}\n\n认证完成后，请使用返回的授权码调用 exchange_code_for_token 工具。`,
        },
      ],
    };
  }

  async handleExchangeCodeForToken(args: any) {
    const { code, redirect_uri, code_verifier } = args;
    if (!code || !redirect_uri) {
      throw new Error('需要提供 code 和 redirect_uri 参数');
    }

    const result = await this.zmemoryClient.exchangeCodeForToken(
      code,
      redirect_uri,
      code_verifier
    );

    return {
      content: [
        {
          type: 'text',
          text: `认证成功！访问令牌已获取并设置完成。`,
        },
      ],
    };
  }

  async handleRefreshToken(args: any) {
    const { refresh_token } = args;
    if (!refresh_token) {
      throw new Error('需要提供 refresh_token 参数');
    }

    const result = await this.zmemoryClient.refreshToken(refresh_token);

    return {
      content: [
        {
          type: 'text',
          text: `令牌已刷新成功。`,
        },
      ],
    };
  }

  async handleGetUserInfo(args: any) {
    const userInfo = await this.zmemoryClient.getUserInfo();

    return {
      content: [
        {
          type: 'text',
          text: `当前用户信息：\n${JSON.stringify(userInfo, null, 2)}`,
        },
      ],
    };
  }

  async handleSetAccessToken(args: any) {
    const { access_token } = args;
    if (!access_token) {
      throw new Error('需要提供 access_token 参数');
    }

    this.zmemoryClient.setAccessToken(access_token);

    return {
      content: [
        {
          type: 'text',
          text: '访问令牌已设置成功。',
        },
      ],
    };
  }

  async handleGetAuthStatus(args: any) {
    const authState = this.zmemoryClient.getAuthState();

    if (!authState.isAuthenticated) {
      return {
        content: [
          {
            type: 'text',
            text: '当前未认证。请使用 authenticate 工具开始认证流程。',
          },
        ],
      };
    }

    const expiresText = authState.expiresAt
      ? `，令牌将于 ${new Date(authState.expiresAt).toLocaleString()} 过期`
      : '';
    const statusText = `已认证${expiresText}。`;

    return {
      content: [
        {
          type: 'text',
          text: statusText,
        },
      ],
    };
  }

  async handleClearAuth(args: any) {
    this.zmemoryClient.clearAuth();

    return {
      content: [
        {
          type: 'text',
          text: '认证状态已清除。',
        },
      ],
    };
  }

  async handleGetSystemStatus(args: any) {
    const { include_recent_errors = true, check_connectivity = true } = args;
    const startTime = Date.now();

    try {
      // Get authentication state
      const authState = this.zmemoryClient.getAuthState();

      // Test connectivity if requested
      let connectivityStatus = 'not_checked';
      let responseTime = 0;
      let apiError = null;

      if (check_connectivity) {
        try {
          const connectivityStart = Date.now();
          const isHealthy = await this.zmemoryClient.healthCheck();
          responseTime = Date.now() - connectivityStart;
          connectivityStatus = isHealthy ? 'healthy' : 'unhealthy';
        } catch (error) {
          connectivityStatus = 'error';
          apiError = error instanceof Error ? error.message : 'Unknown error';
          responseTime = Date.now() - startTime;
        }
      }

      // Build system status report
      const statusReport = {
        timestamp: new Date().toISOString(),
        mcp_server: {
          status: 'running',
          version: '1.0.0',
          uptime_ms: Date.now() - startTime
        },
        authentication: {
          is_authenticated: authState.isAuthenticated,
          has_tokens: !!authState.tokens,
          token_expires_at: authState.expiresAt ? new Date(authState.expiresAt).toISOString() : null,
          expires_in_minutes: authState.expiresAt ? Math.round((authState.expiresAt - Date.now()) / 60000) : null
        },
        api_connectivity: {
          status: connectivityStatus,
          response_time_ms: responseTime,
          error: apiError,
          base_url: process.env.ZMEMORY_API_URL || 'http://localhost:3001'
        },
        configuration: {
          oauth_client_id: process.env.OAUTH_CLIENT_ID || 'zmemory-mcp',
          oauth_scope: process.env.OAUTH_SCOPE || 'tasks.write',
          timeout: process.env.ZMEMORY_TIMEOUT || '10000',
          locale: process.env.ZMEMORY_MCP_LOCALE || 'auto'
        },
        recent_errors: include_recent_errors ? [] : 'not_included' // Could be enhanced with actual error logging
      };

      return {
        content: [
          {
            type: 'text',
            text: `🔍 **System Status Report**\n\n` +
                  `**Server Status**: ${statusReport.mcp_server.status} (v${statusReport.mcp_server.version})\n` +
                  `**Authentication**: ${authState.isAuthenticated ? '✅ Authenticated' : '❌ Not authenticated'}\n` +
                  `**Token Status**: ${authState.tokens ? '✅ Valid tokens available' : '❌ No tokens'}\n` +
                  `${authState.expiresAt ? `**Token Expires**: ${statusReport.authentication.expires_in_minutes}min remaining\n` : ''}` +
                  `**API Connectivity**: ${connectivityStatus === 'healthy' ? '✅' : '❌'} ${connectivityStatus} (${responseTime}ms)\n` +
                  `**Base URL**: ${statusReport.api_connectivity.base_url}\n` +
                  `${apiError ? `**API Error**: ${apiError}\n` : ''}` +
                  `**OAuth Client**: ${statusReport.configuration.oauth_client_id}\n` +
                  `**Timeout**: ${statusReport.configuration.timeout}ms\n` +
                  `**Locale**: ${statusReport.configuration.locale}\n\n` +
                  `💡 **Troubleshooting Tips**:\n` +
                  `${!authState.isAuthenticated ? '- Use "authenticate" tool to start OAuth flow\n' : ''}` +
                  `${authState.expiresAt && (authState.expiresAt - Date.now()) < 300000 ? '- Token expires soon, consider using "refresh_token"\n' : ''}` +
                  `${connectivityStatus === 'error' ? '- Check ZMEMORY_API_URL environment variable\n- Verify ZMemory API server is running\n' : ''}` +
                  `${connectivityStatus === 'unhealthy' ? '- ZMemory API may be experiencing issues\n' : ''}` +
                  `\n**Detailed Status (JSON)**:\n\`\`\`json\n${JSON.stringify(statusReport, null, 2)}\n\`\`\``
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: `❌ **System Status Check Failed**\n\n` +
                  `**Error**: ${errorMessage}\n\n` +
                  `**Troubleshooting**:\n` +
                  `- Check if ZMemory MCP server is properly configured\n` +
                  `- Verify environment variables are set correctly\n` +
                  `- Try restarting the MCP connection\n\n` +
                  `**Basic Info**:\n` +
                  `- Timestamp: ${new Date().toISOString()}\n` +
                  `- Base URL: ${process.env.ZMEMORY_API_URL || 'http://localhost:3001'}\n` +
                  `- Client ID: ${process.env.OAUTH_CLIENT_ID || 'zmemory-mcp'}`
          },
        ],
      };
    }
  }
}