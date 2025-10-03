/**
 * Mock OAuth provider for testing
 */

export class MockOAuthProvider {
  private authorizedCodes = new Map<string, { userId: string; codeVerifier?: string }>();

  generateAuthCode(userId: string, codeVerifier?: string): string {
    const code = `mock-auth-code-${Date.now()}`;
    this.authorizedCodes.set(code, { userId, codeVerifier });
    return code;
  }

  validateAuthCode(code: string, codeVerifier?: string): boolean {
    const stored = this.authorizedCodes.get(code);
    if (!stored) return false;
    if (stored.codeVerifier && stored.codeVerifier !== codeVerifier) return false;
    return true;
  }

  exchangeCodeForTokens(code: string, codeVerifier?: string) {
    if (!this.validateAuthCode(code, codeVerifier)) {
      throw new Error('Invalid authorization code');
    }

    this.authorizedCodes.delete(code);

    return {
      access_token: `mock-access-token-${Date.now()}`,
      refresh_token: `mock-refresh-token-${Date.now()}`,
      expires_in: 3600,
      token_type: 'Bearer',
    };
  }

  refreshToken(refreshToken: string) {
    if (!refreshToken.startsWith('mock-refresh-token')) {
      throw new Error('Invalid refresh token');
    }

    return {
      access_token: `mock-access-token-${Date.now()}`,
      refresh_token: `mock-refresh-token-${Date.now()}`,
      expires_in: 3600,
      token_type: 'Bearer',
    };
  }

  reset() {
    this.authorizedCodes.clear();
  }
}

export function createMockOAuthProvider(): MockOAuthProvider {
  return new MockOAuthProvider();
}
