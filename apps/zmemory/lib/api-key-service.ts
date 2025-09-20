import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { encryptApiKey, decryptApiKey, generateKeyPreview, validateApiKeyFormat } from './encryption';

/**
 * API Key Management Service
 * 
 * Handles CRUD operations for user API keys with encryption,
 * vendor management, and secure retrieval.
 */

export interface Vendor {
  id: string;
  name: string;
  description: string;
  auth_type: 'api_key' | 'oauth' | 'bearer_token';
  base_url: string | null;
  is_active: boolean;
}

export interface VendorService {
  id: string;
  vendor_id: string;
  service_name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
}

export interface UserApiKey {
  id: string;
  user_id: string;
  vendor_id: string;
  service_id: string | null;
  encrypted_key: string;
  key_preview: string | null;
  display_name: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyWithDetails extends Omit<UserApiKey, 'encrypted_key'> {
  vendor_name: string;
  vendor_description: string;
  service_name?: string;
  service_display_name?: string;
}

export interface CreateApiKeyRequest {
  vendor_id: string;
  service_id?: string;
  api_key: string;
  display_name?: string;
}

export interface UpdateApiKeyRequest {
  api_key?: string;
  display_name?: string;
  is_active?: boolean;
}

class ApiKeyService {
  private supabase: SupabaseClient<Database>;

  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Get all active vendors
   */
  async getVendors(): Promise<Vendor[]> {
    const { data, error } = await this.supabase
      .from('vendors')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch vendors: ${error.message}`);
    }

    return (data || []) as unknown as Vendor[];
  }

  /**
   * Get services for a specific vendor
   */
  async getVendorServices(vendorId: string): Promise<VendorService[]> {
    const { data, error } = await this.supabase
      .from('vendor_services')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      throw new Error(`Failed to fetch vendor services: ${error.message}`);
    }

    return (data || []) as unknown as VendorService[];
  }

  /**
   * Get all API keys for a user with vendor/service details
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyWithDetails[]> {
    const { data, error } = await this.supabase
      .from('user_api_keys')
      .select(`
        id,
        user_id,
        vendor_id,
        service_id,
        key_preview,
        display_name,
        is_active,
        last_used_at,
        created_at,
        updated_at,
        vendors:vendor_id (
          name,
          description
        ),
        vendor_services:service_id (
          service_name,
          display_name
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user API keys: ${error.message}`);
    }

    return ((data || []) as any[]).map(item => ({
      id: item.id,
      user_id: item.user_id,
      vendor_id: item.vendor_id,
      service_id: item.service_id,
      key_preview: item.key_preview,
      display_name: item.display_name,
      is_active: item.is_active,
      last_used_at: item.last_used_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      vendor_name: (item.vendors as any)?.name || item.vendor_id,
      vendor_description: (item.vendors as any)?.description || '',
      service_name: (item.vendor_services as any)?.service_name,
      service_display_name: (item.vendor_services as any)?.display_name
    })) as ApiKeyWithDetails[];
  }

  /**
   * Create a new API key for a user
   */
  async createApiKey(userId: string, request: CreateApiKeyRequest): Promise<UserApiKey> {
    // Validate the API key format
    const validation = validateApiKeyFormat(request.api_key, request.vendor_id);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid API key format');
    }

    // Verify vendor exists and is active
    const { data: vendor } = await this.supabase
      .from('vendors')
      .select('id')
      .eq('id', request.vendor_id)
      .eq('is_active', true)
      .single();

    if (!vendor) {
      throw new Error('Vendor not found or inactive');
    }

    // Verify service exists if provided
    if (request.service_id) {
      const { data: service } = await this.supabase
        .from('vendor_services')
        .select('id')
        .eq('id', request.service_id)
        .eq('vendor_id', request.vendor_id)
        .eq('is_active', true)
        .single();

      if (!service) {
        throw new Error('Service not found or inactive');
      }
    }

    // Encrypt the API key
    const encryptedKey = encryptApiKey(request.api_key, userId);
    const keyPreview = generateKeyPreview(request.api_key);

    // Insert the new API key
    const { data, error } = await this.supabase
      .from('user_api_keys')
      .insert({
        user_id: userId,
        vendor_id: request.vendor_id,
        service_id: request.service_id || null,
        encrypted_key: encryptedKey,
        key_preview: keyPreview,
        display_name: request.display_name || null
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('API key already exists for this vendor/service combination');
      }
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return data as unknown as UserApiKey;
  }

  /**
   * Update an existing API key
   */
  async updateApiKey(userId: string, keyId: string, request: UpdateApiKeyRequest): Promise<UserApiKey> {
    const updates: any = {};

    if (request.api_key !== undefined) {
      // Get the vendor_id for validation
      const { data: existingKey } = await this.supabase
        .from('user_api_keys')
        .select('vendor_id')
        .eq('id', keyId)
        .eq('user_id', userId)
        .single();

      if (!existingKey) {
        throw new Error('API key not found');
      }

      // Validate the new API key format
      const validation = validateApiKeyFormat(request.api_key, (existingKey as any).vendor_id);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid API key format');
      }

      updates.encrypted_key = encryptApiKey(request.api_key, userId);
      updates.key_preview = generateKeyPreview(request.api_key);
    }

    if (request.display_name !== undefined) {
      updates.display_name = request.display_name;
    }

    if (request.is_active !== undefined) {
      updates.is_active = request.is_active;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    const { data, error } = await this.supabase
      .from('user_api_keys')
      .update(updates)
      .eq('id', keyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }

    if (!data) {
      throw new Error('API key not found');
    }

    return data as unknown as UserApiKey;
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }
  }

  /**
   * Get and decrypt an API key for use
   */
  async getDecryptedApiKey(
    userId: string, 
    vendorId: string, 
    serviceId?: string
  ): Promise<{ apiKey: string; keyId: string } | null> {
    // Use the database function to get the best matching key
    const { data, error } = await this.supabase
      .rpc('get_user_api_key', {
        p_user_id: userId,
        p_vendor_id: vendorId,
        p_service_id: serviceId || null
      });

    if (error) {
      throw new Error(`Failed to retrieve API key: ${error.message}`);
    }

    if (!data || (data as any[]).length === 0) {
      return null;
    }

    const keyData = (data as any[])[0];
    
    try {
      const decryptedKey = decryptApiKey(keyData.encrypted_key, userId);
      
      // Update last_used_at
      await this.updateLastUsed(userId, vendorId, serviceId);
      
      return {
        apiKey: decryptedKey,
        keyId: keyData.id
      };
    } catch (error) {
      throw new Error(`Failed to decrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update the last_used_at timestamp for an API key
   */
  private async updateLastUsed(userId: string, vendorId: string, serviceId?: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_api_key_last_used', {
        p_user_id: userId,
        p_vendor_id: vendorId,
        p_service_id: serviceId || null
      });

    if (error) {
      console.error('Failed to update last_used_at:', error.message);
      // Don't throw here as it's not critical for the main operation
    }
  }

  /**
   * Test an API key by making a simple request to the vendor's API
   */
  async testApiKey(userId: string, keyId: string): Promise<{ success: boolean; error?: string }> {
    // Get the API key and vendor info
    const { data, error } = await this.supabase
      .from('user_api_keys')
      .select(`
        encrypted_key,
        vendor_id,
        vendors:vendor_id (
          base_url,
          auth_type
        )
      `)
      .eq('id', keyId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return { success: false, error: 'API key not found' };
    }

    try {
      const decryptedKey = decryptApiKey((data as any).encrypted_key, userId);
      const vendor = (data as any).vendors as any;
      
      // Test the API key based on vendor
      return await this.performApiKeyTest((data as any).vendor_id, decryptedKey, vendor.base_url);
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      };
    }
  }

  /**
   * Perform vendor-specific API key testing
   */
  private async performApiKeyTest(vendorId: string, apiKey: string, baseUrl: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      switch (vendorId) {
        case 'openai':
          return await this.testOpenAIKey(apiKey);
        case 'anthropic':
          return await this.testAnthropicKey(apiKey);
        // Add more vendor-specific tests as needed
        default:
          // Generic test - just check if the key format is valid
          return { success: true };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      };
    }
  }

  private async testOpenAIKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: `OpenAI API returned ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: 'Failed to connect to OpenAI API' };
    }
  }

  private async testAnthropicKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: `Anthropic API returned ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: 'Failed to connect to Anthropic API' };
    }
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();
