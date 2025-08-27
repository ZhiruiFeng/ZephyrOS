import { AxiosInstance } from 'axios';
import {
  OAuthError,
  OAuthTokens,
  UserInfo,
  AuthState,
  AuthenticateParams,
  RefreshTokenParams,
  ZMemoryConfig,
} from '../../types.js';

export class AuthModule {
  constructor(
    private client: AxiosInstance,
    private config: ZMemoryConfig,
    private authState: AuthState
  ) {}

  async authenticate(params: AuthenticateParams): Promise<{ authUrl: string; state: string }> {
    const state = params.state || this.generateRandomString(32);
    const scope = params.scope || this.config.oauth?.scope || 'tasks.write';
    const authUrl = new URL(`${this.config.apiUrl}/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.config.oauth?.clientId || params.client_id);
    authUrl.searchParams.set('redirect_uri', this.config.oauth?.redirectUri || params.redirect_uri || 'http://localhost:3000/callback');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    return { authUrl: authUrl.toString(), state };
  }

  async exchangeCodeForToken(code: string, redirectUri: string, codeVerifier?: string): Promise<OAuthTokens> {
    const tokenData: any = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.config.oauth?.clientId || 'zmemory-mcp',
    };

    if (codeVerifier) {
      tokenData.code_verifier = codeVerifier;
    }

    const response = await this.client.post('/oauth/token', tokenData);
    const tokens: OAuthTokens = response.data;
    
    this.authState.isAuthenticated = true;
    this.authState.tokens = tokens;
    this.authState.expiresAt = Date.now() + (tokens.expires_in * 1000);

    return tokens;
  }

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const tokenData: RefreshTokenParams = { refresh_token: refreshToken };
    
    const response = await this.client.post('/oauth/token', {
      grant_type: 'refresh_token',
      ...tokenData,
    });
    
    const tokens: OAuthTokens = response.data;
    
    this.authState.isAuthenticated = true;
    this.authState.tokens = tokens;
    this.authState.expiresAt = Date.now() + (tokens.expires_in * 1000);

    return tokens;
  }

  async getUserInfo(): Promise<UserInfo> {
    const response = await this.client.get('/oauth/userinfo');
    const userInfo: UserInfo = response.data;
    
    this.authState.userInfo = userInfo;
    return userInfo;
  }

  isAuthenticated(): boolean {
    if (!this.authState.isAuthenticated || !this.authState.tokens) {
      return false;
    }

    if (this.authState.expiresAt && Date.now() >= this.authState.expiresAt) {
      return false;
    }

    return true;
  }

  getAuthState(): AuthState {
    return { ...this.authState };
  }

  setAccessToken(accessToken: string): void {
    this.authState.isAuthenticated = true;
    this.authState.tokens = {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
    };
    this.authState.expiresAt = Date.now() + (3600 * 1000);
  }

  clearAuth(): void {
    this.authState.isAuthenticated = false;
    delete this.authState.tokens;
    delete this.authState.expiresAt;
    delete this.authState.userInfo;
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}