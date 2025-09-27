'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Key,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Shield,
  Copy,
  Clock,
  Zap,
  Maximize2,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/contexts/LanguageContext'
import {
  zmemoryApiKeysApi,
  ZMEMORY_SCOPES,
  type ZMemoryApiKey,
  type ZMemoryApiKeyWithToken,
  type CreateZMemoryApiKeyRequest
} from '@/lib/api'
import type { ProfileModuleProps } from '@/profile'

export function ZMemoryApiKeysModule({
  config,
  onConfigChange,
  fullScreenPath,
  isFullscreen,
  onToggleFullscreen
}: ProfileModuleProps) {
  const { user, session } = useAuth()
  const { t } = useTranslation()

  // State
  const [apiKeys, setApiKeys] = useState<ZMemoryApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingKey, setEditingKey] = useState<ZMemoryApiKey | null>(null)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ZMemoryApiKeyWithToken | null>(null)
  const [showNewKey, setShowNewKey] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    scopes: ['tasks.read', 'tasks.write', 'memories.read', 'memories.write'] as string[],
    expires_in_days: 365
  })

  const loadData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const apiKeysData = await zmemoryApiKeysApi.getZMemoryApiKeys()
      setApiKeys(apiKeysData)
    } catch (err) {
      console.error('Error loading ZMemory API keys:', err)
      setError('Unable to load ZMemory API keys. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Load initial data
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user, loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || formData.scopes.length === 0 || !user) return

    try {
      if (editingKey) {
        await zmemoryApiKeysApi.updateZMemoryApiKey(editingKey.id, {
          name: formData.name,
          scopes: formData.scopes
        })
      } else {
        const result = await zmemoryApiKeysApi.createZMemoryApiKey({
          name: formData.name,
          scopes: formData.scopes,
          expires_in_days: formData.expires_in_days || undefined
        })
        setNewlyCreatedKey(result)
        setShowNewKey(true)
      }

      // Reset form and reload data
      setFormData({
        name: '',
        scopes: ['tasks.read', 'tasks.write', 'memories.read', 'memories.write'],
        expires_in_days: 365
      })
      setShowAddForm(false)
      setEditingKey(null)
      await loadData()
    } catch (err) {
      console.error('Error saving ZMemory API key:', err)
      setError('Failed to save ZMemory API key. Please check your input and try again.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ZMemory API key? This action cannot be undone.') || !user) return

    try {
      await zmemoryApiKeysApi.deleteZMemoryApiKey(id)
      await loadData()
    } catch (err) {
      console.error('Error deleting ZMemory API key:', err)
      setError('Failed to delete ZMemory API key. Please try again.')
    }
  }

  const handleToggleActive = async (apiKey: ZMemoryApiKey) => {
    if (!user) return

    try {
      await zmemoryApiKeysApi.updateZMemoryApiKey(apiKey.id, {
        is_active: !apiKey.is_active
      })
      await loadData()
    } catch (err) {
      console.error('Error toggling ZMemory API key:', err)
      setError('Failed to update ZMemory API key status.')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You might want to show a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleScopeToggle = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }))
  }

  if (!user || !session) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h4>
          <p className="text-gray-600">Please sign in to manage your ZMemory API keys.</p>
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">ZMemory API Keys</h3>
              <p className="text-sm text-gray-600">Generate long-lived API keys for MCP and integrations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fullScreenPath && (
              <Link
                href={fullScreenPath}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="View Full Module"
                aria-label="View Full Module"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
            )}

            {!showAddForm && !editingKey && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                aria-label="Generate API Key"
              >
                <Plus className="w-4 h-4" />
                Generate Key
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

      {/* New API Key Display */}
      {newlyCreatedKey && showNewKey && (
        <div className="p-6 border-b border-gray-100 bg-green-50">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
            <div className="flex-1">
              <h4 className="text-lg font-medium text-green-900 mb-2">API Key Generated Successfully!</h4>
              <p className="text-sm text-green-800 mb-4">
                Save this API key somewhere safe. You won't be able to see it again.
              </p>

              <div className="bg-white border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Your ZMemory API Key:</label>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey.api_key)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                </div>
                <code className="block w-full p-2 bg-gray-50 border rounded text-sm font-mono break-all">
                  {newlyCreatedKey.api_key}
                </code>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Next Steps:</h5>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the API key above</li>
                  <li>Configure your Claude Desktop with: <code className="bg-blue-100 px-1 rounded">ZMEMORY_API_KEY=your_key_here</code></li>
                  <li>Restart Claude Desktop</li>
                  <li>Test with MCP tools in Claude Code</li>
                </ol>
              </div>

              <button
                onClick={() => {
                  setNewlyCreatedKey(null)
                  setShowNewKey(false)
                }}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingKey) && (
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Claude MCP Key"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions (Scopes)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(ZMEMORY_SCOPES).map(([scope, description]) => (
                  <label key={scope} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.scopes.includes(scope)}
                      onChange={() => handleScopeToggle(scope)}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-medium text-sm text-gray-900">{scope}</div>
                      <div className="text-xs text-gray-600">{description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {!editingKey && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration (Days)
                </label>
                <select
                  value={formData.expires_in_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, expires_in_days: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={0}>Never expires</option>
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                  <option value={730}>2 years</option>
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formData.scopes.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {editingKey ? 'Update Key' : 'Generate Key'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingKey(null)
                  setFormData({
                    name: '',
                    scopes: ['tasks.read', 'tasks.write', 'memories.read', 'memories.write'],
                    expires_in_days: 365
                  })
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
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No ZMemory API Keys</h4>
            <p className="text-gray-600 mb-4">Generate your first API key to enable MCP access and integrations.</p>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Generate Your First Key
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map(apiKey => (
              <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${apiKey.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <div className="font-medium text-gray-900">{apiKey.name}</div>
                      <div className="text-xs text-gray-500">Created: {new Date(apiKey.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(apiKey)}
                      className={`px-3 py-1 text-xs rounded-full border ${apiKey.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      {apiKey.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => setEditingKey(apiKey)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      aria-label="Edit API key"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(apiKey.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      aria-label="Delete API key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-600">
                  Scopes: {apiKey.scopes.join(', ')}
                </div>

                {apiKey.expires_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    Expires: {new Date(apiKey.expires_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
