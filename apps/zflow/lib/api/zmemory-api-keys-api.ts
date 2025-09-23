import { API_BASE, authenticatedFetch } from './api-base'

// Types for ZMemory API Keys
export interface ZMemoryApiKey {
  id: string
  name: string
  key_preview: string | null
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface ZMemoryApiKeyWithToken extends ZMemoryApiKey {
  api_key: string // Only present when first created
}

export interface CreateZMemoryApiKeyRequest {
  name: string
  scopes: string[]
  expires_in_days?: number
}

export interface UpdateZMemoryApiKeyRequest {
  name?: string
  is_active?: boolean
  scopes?: string[]
}

// Available scopes for ZMemory API keys
export const ZMEMORY_SCOPES = {
  'tasks.read': 'Read tasks and task data',
  'tasks.write': 'Create, update, and delete tasks',
  'tasks.time': 'Track time for tasks',
  'memories.read': 'Read memories and memory data',
  'memories.write': 'Create, update, and delete memories',
  'activities.read': 'Read activities and activity data',
  'activities.write': 'Create, update, and delete activities',
  'timeline.read': 'Read timeline data and insights',
  'timeline.write': 'Create timeline entries',
  'ai_tasks.read': 'Read AI tasks and their status',
  'ai_tasks.write': 'Create, update, and manage AI tasks',
  'categories.read': 'Read task categories',
  'categories.write': 'Create and manage task categories'
} as const

export type ZMemoryScope = keyof typeof ZMEMORY_SCOPES

/**
 * Get all ZMemory API keys for the authenticated user
 */
export async function getZMemoryApiKeys(): Promise<ZMemoryApiKey[]> {
  const response = await authenticatedFetch(`${API_BASE}/user/api-keys`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to fetch ZMemory API keys: ${response.status}`)
  }

  const data = await response.json()
  return data.data || []
}

/**
 * Create a new ZMemory API key
 */
export async function createZMemoryApiKey(request: CreateZMemoryApiKeyRequest): Promise<ZMemoryApiKeyWithToken> {
  const response = await authenticatedFetch(`${API_BASE}/user/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to create ZMemory API key: ${response.status}`)
  }

  const data = await response.json()
  return data.data
}

/**
 * Update an existing ZMemory API key
 */
export async function updateZMemoryApiKey(id: string, request: UpdateZMemoryApiKeyRequest): Promise<ZMemoryApiKey> {
  const response = await authenticatedFetch(`${API_BASE}/user/api-keys/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to update ZMemory API key: ${response.status}`)
  }

  const data = await response.json()
  return data.data
}

/**
 * Delete a ZMemory API key
 */
export async function deleteZMemoryApiKey(id: string): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE}/user/api-keys/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `Failed to delete ZMemory API key: ${response.status}`)
  }
}

// Export as default API object for consistency
export const zmemoryApiKeysApi = {
  getZMemoryApiKeys,
  createZMemoryApiKey,
  updateZMemoryApiKey,
  deleteZMemoryApiKey,
  scopes: ZMEMORY_SCOPES,
}