'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Key,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Shield,
  Zap,
  Maximize2
} from 'lucide-react'
import { useAuth } from '../../../../contexts/AuthContext'
import { useTranslation } from '../../../../contexts/LanguageContext'
import { resolveZmemoryOrigin } from '../../../../lib/api/zmemory-api-base'
import type { ProfileModuleProps } from '../types'

// Types
interface Vendor {
  id: string
  name: string
  description: string
  auth_type: 'api_key' | 'oauth' | 'bearer_token'
  base_url: string | null
  is_active: boolean
}

interface VendorService {
  id: string
  vendor_id: string
  service_name: string
  display_name: string
  description: string | null
  is_active: boolean
}

interface ApiKeyWithDetails {
  id: string
  vendor_id: string
  service_id: string | null
  key_preview: string | null
  display_name: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
  vendor_name: string
  vendor_description: string
  service_name?: string
  service_display_name?: string
}

// API Client
class ApiKeyClient {
  private baseUrl: string

  constructor() {
    // Use zmemory API URL
    this.baseUrl = resolveZmemoryOrigin('http://localhost:3001') || 'http://localhost:3001'
  }

  private async getAuthHeaders(session: any) {
    if (!session?.access_token) {
      throw new Error('No authentication session available')
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }

  async getVendors(session: any): Promise<Vendor[]> {
    const response = await fetch(`${this.baseUrl}/api/vendors`, {
      headers: await this.getAuthHeaders(session)
    })
    if (!response.ok) throw new Error('Failed to fetch vendors')
    const data = await response.json()
    return data.vendors
  }

  async getVendorServices(vendorId: string, session: any): Promise<VendorService[]> {
    const response = await fetch(`${this.baseUrl}/api/vendors/${vendorId}/services`, {
      headers: await this.getAuthHeaders(session)
    })
    if (!response.ok) throw new Error('Failed to fetch vendor services')
    const data = await response.json()
    return data.data
  }

  async getApiKeys(session: any): Promise<ApiKeyWithDetails[]> {
    const response = await fetch(`${this.baseUrl}/api/api-keys`, {
      headers: await this.getAuthHeaders(session)
    })
    if (!response.ok) throw new Error('Failed to fetch API keys')
    const data = await response.json()
    return data.data
  }

  async createApiKey(payload: {
    vendor_id: string
    service_id?: string
    api_key: string
    display_name?: string
  }, session: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/api-keys`, {
      method: 'POST',
      headers: await this.getAuthHeaders(session),
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create API key')
    }
  }

  async updateApiKey(id: string, payload: {
    api_key?: string
    display_name?: string
    is_active?: boolean
  }, session: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/api-keys/${id}`, {
      method: 'PUT',
      headers: await this.getAuthHeaders(session),
      body: JSON.stringify(payload)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update API key')
    }
  }

  async deleteApiKey(id: string, session: any): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/api-keys/${id}`, {
      method: 'DELETE',
      headers: await this.getAuthHeaders(session)
    })
    if (!response.ok) throw new Error('Failed to delete API key')
  }

  async testApiKey(id: string, session: any): Promise<{ success: boolean; error?: string }> {
    const response = await fetch(`${this.baseUrl}/api/api-keys/${id}/test`, {
      method: 'POST',
      headers: await this.getAuthHeaders(session)
    })
    if (!response.ok) throw new Error('Failed to test API key')
    const data = await response.json()
    return {
      success: data.test_success,
      error: data.error
    }
  }
}

const apiClient = new ApiKeyClient()

export function ApiKeysModule({ config, onConfigChange, fullScreenPath }: ProfileModuleProps) {
  const { user, session } = useAuth()
  const { t } = useTranslation()
  
  // State
  const [apiKeys, setApiKeys] = useState<ApiKeyWithDetails[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [services, setServices] = useState<Record<string, VendorService[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKeyWithDetails | null>(null)
  const [testingKeys, setTestingKeys] = useState<Set<string>>(new Set())

  // Form state
  const [formData, setFormData] = useState({
    vendor_id: '',
    service_id: '',
    api_key: '',
    display_name: ''
  })

  const loadData = useCallback(async () => {
    if (!session) return
    
    try {
      setLoading(true)
      const [vendorsData, apiKeysData] = await Promise.all([
        apiClient.getVendors(session),
        apiClient.getApiKeys(session)
      ])
      
      setVendors(Array.isArray(vendorsData) ? vendorsData : [])
      setApiKeys(Array.isArray(apiKeysData) ? apiKeysData : [])
      
      // Load services for each vendor
      const servicesData: Record<string, VendorService[]> = {}
      const validVendors = Array.isArray(vendorsData) ? vendorsData : []
      for (const vendor of validVendors) {
        try {
          const services = await apiClient.getVendorServices(vendor.id, session)
          servicesData[vendor.id] = Array.isArray(services) ? services : []
        } catch (err) {
          console.error(`Failed to load services for ${vendor.id}:`, err)
          servicesData[vendor.id] = []
        }
      }
      setServices(servicesData)
    } catch (err) {
      console.error('Error loading API keys data:', err)
      setError('Unable to load API keys. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }, [session])

  // Load initial data
  useEffect(() => {
    if (user && session) {
      loadData()
    }
  }, [user, session, loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.vendor_id || !formData.api_key || !session) return

    try {
      if (editingKey) {
        await apiClient.updateApiKey(editingKey.id, {
          api_key: formData.api_key || undefined,
          display_name: formData.display_name || undefined
        }, session)
      } else {
        await apiClient.createApiKey({
          vendor_id: formData.vendor_id,
          service_id: formData.service_id || undefined,
          api_key: formData.api_key,
          display_name: formData.display_name || undefined
        }, session)
      }
      
      // Reset form and reload data
      setFormData({ vendor_id: '', service_id: '', api_key: '', display_name: '' })
      setShowAddForm(false)
      setEditingKey(null)
      await loadData()
    } catch (err) {
      console.error('Error saving API key:', err)
      setError('Failed to save API key. Please check your input and try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?') || !session) return
    
    try {
      await apiClient.deleteApiKey(id, session)
      await loadData()
    } catch (err) {
      console.error('Error deleting API key:', err)
      setError('Failed to delete API key. Please try again.')
    }
  }

  const handleTest = async (id: string) => {
    if (!session) return
    
    setTestingKeys(prev => new Set(prev.add(id)))
    
    try {
      const result = await apiClient.testApiKey(id, session)
      if (result.success) {
        alert('API key is valid! ✅')
      } else {
        alert(`API key test failed: ${result.error || 'Unknown error'} ❌`)
      }
    } catch (err) {
      alert(`Failed to test API key: ${err instanceof Error ? err.message : 'Unknown error'} ❌`)
    } finally {
      setTestingKeys(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const getVendorIcon = (vendorId: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'openai': <Zap className="w-5 h-5 text-green-600" />,
      'anthropic': <Shield className="w-5 h-5 text-orange-600" />,
      'google': <ExternalLink className="w-5 h-5 text-blue-600" />
    }
    return iconMap[vendorId] || <Key className="w-5 h-5 text-gray-600" />
  }

  if (!user || !session) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h4>
          <p className="text-gray-600">Please sign in to manage your API keys.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
              <p className="text-sm text-gray-600">Manage your AI service API keys</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fullScreenPath && (
              <Link
                href={fullScreenPath}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title={t.profile.viewFullModule}
                aria-label={t.profile.viewFullModule}
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
            )}

            {!showAddForm && !editingKey && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                aria-label="Add API Key"
              >
                <Plus className="w-4 h-4" />
                Add Key
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingKey) && (
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <select
                  value={formData.vendor_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, vendor_id: e.target.value, service_id: '' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select vendor...</option>
                  {(vendors || []).map(vendor => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.vendor_id && services[formData.vendor_id]?.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service (Optional)
                  </label>
                  <select
                    value={formData.service_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, service_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All services</option>
                    {(services[formData.vendor_id] || []).map(service => (
                      <option key={service.id} value={service.id}>
                        {service.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={editingKey ? "Leave empty to keep current key" : "Enter your API key"}
                required={!editingKey}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="My OpenAI Key"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingKey ? 'Update Key' : 'Add Key'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingKey(null)
                  setFormData({ vendor_id: '', service_id: '', api_key: '', display_name: '' })
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* API Keys List */}
      <div className="p-6">
        {apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h4>
            <p className="text-gray-600 mb-4">Add your first API key to get started with AI services.</p>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Key
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {(apiKeys || []).map(apiKey => (
              <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getVendorIcon(apiKey.vendor_id)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {apiKey.display_name || `${apiKey.vendor_name} Key`}
                        </span>
                        {apiKey.service_display_name && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {apiKey.service_display_name}
                          </span>
                        )}
                        {!apiKey.is_active && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>{apiKey.vendor_name}</span>
                        {apiKey.key_preview && (
                          <span className="font-mono">{apiKey.key_preview}</span>
                        )}
                        {apiKey.last_used_at && (
                          <span>Used {new Date(apiKey.last_used_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(apiKey.id)}
                      disabled={testingKeys.has(apiKey.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Test API key"
                    >
                      {testingKeys.has(apiKey.id) ? (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setEditingKey(apiKey)
                        setFormData({
                          vendor_id: apiKey.vendor_id,
                          service_id: apiKey.service_id || '',
                          api_key: '',
                          display_name: apiKey.display_name || ''
                        })
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit API key"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(apiKey.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete API key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
