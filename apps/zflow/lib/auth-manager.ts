"use client"

import { supabase } from './supabase'

class AuthTokenManager {
  private cachedToken: string | null = null
  private tokenExpiry: number = 0
  private pendingRefresh: Promise<string | null> | null = null

  async getValidToken(): Promise<string | null> {
    const now = Date.now()
    
    // Return cached token if still valid
    if (this.cachedToken && now < this.tokenExpiry) {
      return this.cachedToken
    }

    // If already refreshing, wait for it
    if (this.pendingRefresh) {
      return this.pendingRefresh
    }

    // Start refresh process
    this.pendingRefresh = this.refreshToken()
    const token = await this.pendingRefresh
    this.pendingRefresh = null
    
    return token
  }

  private async refreshToken(): Promise<string | null> {
    try {
      if (!supabase) {
        console.warn('⚠️  Supabase client not initialized - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
        return null
      }

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ Supabase auth error:', error)
        return null
      }

      const token = data.session?.access_token

      if (token) {
        this.cachedToken = token
        // Cache for 55 minutes (tokens typically expire in 60 minutes)
        this.tokenExpiry = Date.now() + (55 * 60 * 1000)
        console.log('🔐 Auth token cached successfully')
        console.log('   User ID:', data.session?.user?.id)
      } else {
        this.cachedToken = null
        this.tokenExpiry = 0
        console.log('ℹ️  No active Supabase session - user not logged in')
      }

      return token || null
    } catch (error) {
      console.error('❌ Failed to refresh auth token:', error)
      this.cachedToken = null
      this.tokenExpiry = 0
      return null
    }
  }

  clearCache() {
    this.cachedToken = null
    this.tokenExpiry = 0
    this.pendingRefresh = null
    console.log('🗑️  Auth token cache cleared')
  }

  // Helper to get auth headers for API calls
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken()
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
    // Return empty object if no token (user not authenticated)
    return {}
  }
}

// Export singleton instance
export const authManager = new AuthTokenManager()

// Helper function for backward compatibility
export async function getAuthHeader(): Promise<Record<string, string>> {
  return authManager.getAuthHeaders()
}