import Constants from 'expo-constants';
import { supabase } from '../../utils/api';

// API Configuration
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
export const API_BASE = API_BASE_URL.replace(/\/api$/, ''); // Remove /api suffix if present

console.log('🔗 ZMemory API Base URL:', API_BASE);

// Common Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

// API Error Class
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Auth Token Manager
class AuthTokenManager {
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;
  private pendingRefresh: Promise<string | null> | null = null;

  async getValidToken(): Promise<string | null> {
    const now = Date.now();

    // Return cached token if still valid
    if (this.cachedToken && now < this.tokenExpiry) {
      return this.cachedToken;
    }

    // If already refreshing, wait for it
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }

    // Start refresh process
    this.pendingRefresh = this.refreshToken();
    const token = await this.pendingRefresh;
    this.pendingRefresh = null;

    return token;
  }

  private async refreshToken(): Promise<string | null> {
    try {
      if (!supabase) return null;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        this.cachedToken = token;
        // Cache for 55 minutes (tokens typically expire in 60 minutes)
        this.tokenExpiry = Date.now() + (55 * 60 * 1000);
        console.log('🔐 Auth token cached successfully');
      } else {
        this.cachedToken = null;
        this.tokenExpiry = 0;
      }

      return token || null;
    } catch (error) {
      console.error('Failed to refresh auth token:', error);
      this.cachedToken = null;
      this.tokenExpiry = 0;
      return null;
    }
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiry = 0;
    this.pendingRefresh = null;
  }
}

export const authManager = new AuthTokenManager();

// Authenticated Fetch Utility
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await authManager.getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });

  return response;
}

// Generic API Request Function
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}/api${endpoint}`;

  try {
    const response = await authenticatedFetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      if (isJson) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Ignore JSON parsing errors for error responses
        }
      } else {
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch (e) {
          // Ignore text parsing errors
        }
      }

      console.error(`❌ API Error: ${errorMessage}`);
      throw new ApiError(response.status, errorMessage);
    }

    if (isJson) {
      const data = await response.json();
      return data as T;
    }

    // For non-JSON responses (like DELETE), return empty object
    return {} as T;
  } catch (error) {
    console.error(`❌ API Request Failed: ${url}`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(error instanceof Error ? error.message : 'Request failed');
  }
}