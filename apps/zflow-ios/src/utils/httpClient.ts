import { supabase } from './api';

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

class HttpClient {
  private baseURL: string;
  private defaultTimeout: number = 10000; // 10 seconds

  constructor(baseURL: string) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      // Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log('🔑 Added auth header to request');
      } else {
        console.log('⚠️ No auth token available - request will be unauthenticated');
      }
    } catch (error) {
      console.error('❌ Failed to get auth token:', error);
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const { method = 'GET', body, timeout = this.defaultTimeout } = config;

    try {
      console.log(`🌐 ${method} ${url}`);

      // Get auth headers
      const authHeaders = await this.getAuthHeaders();
      const headers = { ...authHeaders, ...config.headers };

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestConfig: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      // Add body for non-GET requests
      if (body && method !== 'GET') {
        requestConfig.body = JSON.stringify(body);
      }

      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      console.log(`📡 Response: ${response.status} ${response.statusText}`);

      let responseData: T | undefined;
      const contentType = response.headers.get('content-type');

      // Parse response based on content type
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = (await response.text()) as unknown as T;
      }

      if (!response.ok) {
        const errorMessage = typeof responseData === 'object' && responseData && 'error' in responseData
          ? (responseData as any).error
          : `HTTP ${response.status}: ${response.statusText}`;

        console.error(`❌ API Error: ${errorMessage}`);

        return {
          error: errorMessage,
          status: response.status,
        };
      }

      console.log(`✅ Request successful`);
      return {
        data: responseData,
        status: response.status,
      };

    } catch (error: any) {
      console.error(`❌ Request failed:`, error);

      let errorMessage = 'Network request failed';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        error: errorMessage,
        status: 0,
      };
    }
  }

  // HTTP method helpers
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create and export HTTP client instance
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';
export const httpClient = new HttpClient(API_BASE_URL);

// Helper function to handle API responses consistently
export const handleApiResponse = <T>(response: ApiResponse<T>): T => {
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data as T;
};