// npm i lucide-react framer-motion recharts
// shadcn/ui already installed in host app providing Card/Button/Input

'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  ExternalLink,
  Bot,
  MessageSquare,
  Zap,
  Code,
  Search as SearchIcon,
  Newspaper,
  Mic,
  Volume2,
  Users,
  MessageCircle,
  LayoutGrid,
  Orbit,
  Loader2,
  AlertCircle,
  Edit,
  Trash2,
  X,
  ChevronDown,
  Star,
  DollarSign,
  Activity,
  Clock,
  TrendingUp,
  Maximize2
} from 'lucide-react'
import { 
  useAIAgents, 
  useAIInteractions, 
  useVendors, 
  useAgentFeatures, 
  useInteractionTypes,
  type AIAgent, 
  type AIInteraction, 
  type Vendor, 
  type AgentFeature as NewAgentFeature,
  type InteractionType
} from '../../../../hooks/useAIAgents'
import { useTranslation } from '../../../../contexts/LanguageContext'

// Legacy types for backward compatibility (deprecated)
export type AgentVendor = "ChatGPT" | "Claude" | "Perplexity" | "ElevenLabs" | "Toland" | "Other"
export type AgentFeature = "Brainstorming" | "Daily Q&A" | "Coding" | "MCP" | "News Search" | "Comet" | "TTS" | "STT" | "Companion" | "Speech"

// Updated types for new schema
export interface SimpleAgent {
  id: string
  name: string
  description?: string
  vendor_id: string
  vendor_name?: string
  service_id?: string
  service_name?: string
  model_name?: string
  notes?: string
  tags: string[]
  features: NewAgentFeature[]
  activity_score: number
  usage_count: number
  is_favorite: boolean
  last_used_at?: string
  monthly_cost?: number
  recent_interactions?: number
  avg_satisfaction?: number
}

export interface InteractionItem {
  id: string
  agent_id: string
  title: string
  description?: string
  interaction_type_id: string
  interaction_type_name?: string
  agent_name?: string
  agent_vendor_name?: string
  date_iso: string
  link?: string
  tags: string[]
  total_cost?: number
  satisfaction_rating?: number
  duration_minutes?: number
}

// Convert API types to component types
const convertAIAgentToSimpleAgent = (agent: AIAgent): SimpleAgent => ({
  id: agent.id,
  name: agent.name,
  description: agent.description,
  vendor_id: agent.vendor_id,
  vendor_name: agent.vendor_name,
  service_id: agent.service_id,
  service_name: agent.service_name,
  model_name: agent.model_name,
  notes: agent.notes,
  tags: agent.tags || [],
  features: agent.features || [],
  activity_score: agent.activity_score,
  usage_count: agent.usage_count,
  is_favorite: agent.is_favorite,
  last_used_at: agent.last_used_at,
  monthly_cost: agent.monthly_cost,
  recent_interactions: agent.recent_interactions,
  avg_satisfaction: agent.avg_satisfaction
})

const convertAIInteractionToInteractionItem = (interaction: AIInteraction): InteractionItem => ({
  id: interaction.id,
  agent_id: interaction.agent_id,
  title: interaction.title,
  description: interaction.description,
  interaction_type_id: interaction.interaction_type_id,
  interaction_type_name: interaction.interaction_type_name,
  agent_name: (interaction as any).agent_name,
  agent_vendor_name: (interaction as any).agent_vendor_name,
  date_iso: interaction.started_at || interaction.created_at,
  link: interaction.external_link,
  tags: interaction.tags || [],
  total_cost: interaction.total_cost,
  satisfaction_rating: interaction.satisfaction_rating,
  duration_minutes: interaction.duration_minutes
})

interface AgentDirectoryProps {
  // Updated props for new schema
  initialAgents?: SimpleAgent[]
  initialHistory?: InteractionItem[]
  onAddAgent?: (agent: SimpleAgent) => void
  onAddInteraction?: (interaction: InteractionItem) => void
  showAnalytics?: boolean // Show cost and analytics
  enableAdvancedFeatures?: boolean // Enable advanced vendor/service selection
  fullScreenPath?: string
}

// Helper functions for dynamic icons and colors
const getVendorIcon = (vendorId: string): React.ComponentType<{ className?: string }> => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'openai': Bot,
    'anthropic': MessageSquare,
    'google': SearchIcon,
    'perplexity': SearchIcon,
    'elevenlabs': Volume2,
    'toland': Users
  }
  return iconMap[vendorId] || Bot
}

const getVendorColor = (vendorId: string): string => {
  const colorMap: Record<string, string> = {
    'openai': 'bg-indigo-50 border-indigo-200 text-indigo-800',
    'anthropic': 'bg-emerald-50 border-emerald-200 text-emerald-800',
    'google': 'bg-red-50 border-red-200 text-red-800',
    'perplexity': 'bg-amber-50 border-amber-200 text-amber-800',
    'elevenlabs': 'bg-sky-50 border-sky-200 text-sky-800',
    'toland': 'bg-rose-50 border-rose-200 text-rose-800'
  }
  return colorMap[vendorId] || 'bg-slate-50 border-slate-200 text-slate-800'
}

const getFeatureIcon = (featureId: string): React.ComponentType<{ className?: string }> => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'brainstorming': Zap,
    'daily_qa': MessageCircle,
    'coding': Code,
    'mcp': Bot,
    'news_search': Newspaper,
    'analysis': TrendingUp,
    'tts': Volume2,
    'stt': Mic,
    'companion': Users,
    'speech': MessageCircle,
    'research': SearchIcon,
    'writing': Edit
  }
  return iconMap[featureId] || Zap
}

// No demo data - component will fetch real data from API

// Modern Service Selector Component
const ModernServiceSelector: React.FC<{
  selectedServiceId: string
  availableServices: any[]
  onServiceChange: (serviceId: string) => void
}> = ({ selectedServiceId, availableServices, onServiceChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedService = availableServices.find(s => s.id === selectedServiceId)

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer transition-all duration-200 ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'hover:border-gray-400'
        }`}
      >
        <div className="flex items-center justify-between">
          {selectedService ? (
            <div className="flex-1 min-w-0">
              <span className="text-gray-900 font-medium truncate">{selectedService.display_name}</span>
              {selectedService.description && (
                <div className="text-xs text-gray-500 truncate">{selectedService.description}</div>
              )}
            </div>
          ) : (
            <span className="text-gray-500 truncate">Choose a service (optional)</span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto sm:max-h-48 max-h-64">
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onServiceChange('')
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 sm:py-2 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                !selectedServiceId ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
              }`}
            >
              <div className="font-medium">No service selected</div>
              <div className="text-xs text-gray-500">Use default service</div>
            </button>
            {availableServices.map(service => (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  onServiceChange(service.id)
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-2 sm:py-2 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                  selectedServiceId === service.id ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                }`}
              >
                <div className={`font-medium truncate ${selectedServiceId === service.id ? 'text-blue-800' : 'text-gray-900'}`}>
                  {service.display_name}
                </div>
                {service.description && (
                  <div className="text-xs text-gray-500 truncate">{service.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Modern Agent Selector Component
const ModernAgentSelector: React.FC<{
  selectedAgentId: string
  availableAgents: SimpleAgent[]
  onAgentChange: (agentId: string) => void
  placeholder?: string
  label?: string
}> = ({ selectedAgentId, availableAgents, onAgentChange, placeholder = "Select agent...", label = "Agent" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedAgent = availableAgents.find(a => a.id === selectedAgentId)

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer transition-all duration-200 ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'hover:border-gray-400'
        }`}
      >
        <div className="flex items-center justify-between">
          {selectedAgent ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getVendorColor(selectedAgent.vendor_id).split(' ')[0]}`}></div>
              <div className="flex-1 min-w-0">
                <span className="text-gray-900 font-medium truncate">{selectedAgent.name}</span>
                <span className="text-xs text-gray-500 ml-1 truncate">• {selectedAgent.vendor_name}</span>
              </div>
            </div>
          ) : (
            <span className="text-gray-500 truncate">{placeholder}</span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 sm:max-h-48 max-h-64 overflow-y-auto">
          <div className="py-1">
            {availableAgents.length > 0 ? (
              availableAgents.map(agent => {
                const VendorIcon = getVendorIcon(agent.vendor_id)
                const isSelected = selectedAgentId === agent.id
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      onAgentChange(agent.id)
                      setIsOpen(false)
                    }}
                    className={`w-full px-3 py-2 sm:py-2 py-3 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 ${getVendorColor(agent.vendor_id).split(' ')[0]} flex items-center justify-center`}>
                      <VendorIcon className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${isSelected ? 'text-blue-800' : 'text-gray-900'}`}>
                        {agent.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {agent.vendor_name}
                        {agent.features.length > 0 && ` • ${agent.features.length} features`}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="p-3 text-sm text-gray-500">No agents available</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Modern Interaction Type Selector Component
const ModernInteractionTypeSelector: React.FC<{
  selectedTypeId: string
  availableTypes: InteractionType[]
  onTypeChange: (typeId: string) => void
  loading?: boolean
  placeholder?: string
  label?: string
}> = ({ selectedTypeId, availableTypes, onTypeChange, loading, placeholder = "Select type...", label = "Type" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedType = availableTypes.find(t => t.id === selectedTypeId)

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      
      <div
        onClick={() => !loading && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer transition-all duration-200 ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'hover:border-gray-400'
        } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <div className="flex items-center justify-between">
          {selectedType ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedType.color || '#3B82F6' }}
              ></div>
              <div className="flex-1 min-w-0">
                <span className="text-gray-900 font-medium truncate">{selectedType.name}</span>
                {selectedType.description && (
                  <div className="text-xs text-gray-500 truncate">{selectedType.description}</div>
                )}
              </div>
            </div>
          ) : (
            <span className="text-gray-500 truncate">{loading ? 'Loading types...' : placeholder}</span>
          )}
          <div className="flex items-center gap-2 ml-2">
            {loading && <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 sm:max-h-48 max-h-64 overflow-y-auto">
          <div className="py-1">
            {availableTypes.length > 0 ? (
              availableTypes.map(type => {
                const isSelected = selectedTypeId === type.id
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      onTypeChange(type.id)
                      setIsOpen(false)
                    }}
                    className={`w-full px-3 py-2 sm:py-2 py-3 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                    }`}
                  >
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: type.color || '#3B82F6' }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${isSelected ? 'text-blue-800' : 'text-gray-900'}`}>
                        {type.name}
                      </div>
                      {type.description && (
                        <div className="text-xs text-gray-500 truncate">{type.description}</div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="p-3 text-sm text-gray-500">No interaction types available</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Modern Vendor Selector Component
const VendorSelector: React.FC<{
  selectedVendorId: string
  selectedServiceId?: string
  availableVendors: Vendor[]
  onVendorChange: (vendorId: string) => void
  onServiceChange: (serviceId: string) => void
  loading?: boolean
  placeholder?: string
}> = ({ 
  selectedVendorId, 
  selectedServiceId = '',
  availableVendors, 
  onVendorChange, 
  onServiceChange,
  loading, 
  placeholder = "Select vendor..." 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedVendor = availableVendors.find(v => v.id === selectedVendorId)
  // Services are fetched separately; vendors currently have no embedded services
  const availableServices: any[] = []
  const selectedService = availableServices.find(s => s.id === selectedServiceId)

  const handleVendorSelect = (vendorId: string) => {
    onVendorChange(vendorId)
    onServiceChange('') // Reset service when vendor changes
    setIsOpen(false)
  }

  return (
    <div className="space-y-3">
      {/* Vendor Selector */}
      <div className="relative" ref={dropdownRef}>
        <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
        
        {/* Vendor Dropdown Trigger */}
        <div
          onClick={() => !loading && setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer transition-all duration-200 ${
            isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'hover:border-gray-400'
          } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            {selectedVendor ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getVendorColor(selectedVendor.id).split(' ')[0]}`}></div>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-900 font-medium truncate">{selectedVendor.name}</span>
                  {selectedVendor.description && (
                    <div className="text-xs text-gray-500 truncate">{selectedVendor.description}</div>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-gray-500 truncate">{loading ? 'Loading vendors...' : placeholder}</span>
            )}
            <div className="flex items-center gap-2 ml-2">
              {loading && <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* Vendor Dropdown Options */}
        {isOpen && !loading && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 sm:max-h-48 max-h-64 overflow-y-auto">
            {availableVendors.length > 0 ? (
              <div className="py-1">
                {availableVendors.map(vendor => {
                  const VendorIcon = getVendorIcon(vendor.id)
                  const isSelected = selectedVendorId === vendor.id
                  return (
                    <button
                      key={vendor.id}
                      type="button"
                      onClick={() => handleVendorSelect(vendor.id)}
                      className={`w-full px-3 py-2 sm:py-2.5 py-3 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 transition-colors ${
                        isSelected ? 'bg-blue-50 text-blue-800' : 'text-gray-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full flex-shrink-0 ${getVendorColor(vendor.id).split(' ')[0]} flex items-center justify-center`}>
                        <VendorIcon className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${isSelected ? 'text-blue-800' : 'text-gray-900'}`}>
                          {vendor.name}
                        </div>
                        {vendor.description && (
                          <div className="text-xs text-gray-500 truncate">
                            {vendor.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="p-3 text-sm text-gray-500">No vendors available</div>
            )}
          </div>
        )}
      </div>

      {/* Service Selector (if vendor has services) */}
      {availableServices.length > 0 && (
        <ModernServiceSelector
          selectedServiceId={selectedServiceId}
          availableServices={availableServices}
          onServiceChange={onServiceChange}
        />
      )}
    </div>
  )
}

// Utility functions
const formatDate = (dateISO: string) => {
  return new Date(dateISO).toLocaleString()
}

// Multi-Select Features Dropdown Component
const FeaturesMultiSelect: React.FC<{
  selectedFeatures: string[]
  availableFeatures: NewAgentFeature[]
  onChange: (featureIds: string[]) => void
  loading?: boolean
  placeholder?: string
  maxHeight?: string
}> = ({ selectedFeatures, availableFeatures, onChange, loading, placeholder = "Select features...", maxHeight = "max-h-48" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleFeature = (featureId: string) => {
    const newSelection = selectedFeatures.includes(featureId)
      ? selectedFeatures.filter(id => id !== featureId)
      : [...selectedFeatures, featureId]
    onChange(newSelection)
  }

  const selectedFeaturesData = selectedFeatures.map(id => 
    availableFeatures.find(f => f.id === id)
  ).filter(Boolean) as NewAgentFeature[]

  // Group features by category
  const groupedFeatures = availableFeatures.reduce((acc, feature) => {
    const category = feature.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(feature)
    return acc
  }, {} as Record<string, NewAgentFeature[]>)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Multi-Select Input */}
      <div
        onClick={() => !loading && setIsOpen(!isOpen)}
        className={`w-full min-h-[40px] px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer transition-all duration-200 ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'hover:border-gray-400'
        } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Selected Feature Tags */}
          {selectedFeaturesData.map(feature => {
            const FeatureIcon = getFeatureIcon(feature.id)
            return (
              <span
                key={feature.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
              >
                <FeatureIcon className="w-3 h-3" />
                {feature.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFeature(feature.id)
                  }}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )
          })}
          
          {/* Placeholder or loading */}
          {selectedFeatures.length === 0 && !loading && (
            <span className="text-gray-500 text-sm">{placeholder}</span>
          )}
          
          {loading && (
            <span className="text-gray-500 text-sm flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              Loading...
            </span>
          )}
          
          {/* Spacer and arrow */}
          <div className="flex-1"></div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Options */}
      {isOpen && !loading && (
        <div className={`absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden`}>
          {Object.keys(groupedFeatures).length > 0 ? (
            <div className={`${maxHeight} sm:${maxHeight} max-h-64 overflow-y-auto`}>
              {/* Header with select controls */}
              <div className="px-3 py-2 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10">
                <span className="text-xs font-medium text-gray-600 truncate">
                  {selectedFeatures.length} of {availableFeatures.length} selected
                </span>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange([])
                    }}
                    className="text-xs text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors disabled:opacity-50 px-1 py-0.5 rounded"
                    disabled={selectedFeatures.length === 0}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange(availableFeatures.map(f => f.id))
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 active:text-blue-900 transition-colors disabled:opacity-50 px-1 py-0.5 rounded"
                    disabled={selectedFeatures.length === availableFeatures.length}
                  >
                    All
                  </button>
                </div>
              </div>
              
              {/* Feature Options by Category */}
              <div className="pb-1">
                {Object.entries(groupedFeatures).map(([category, features]) => (
                  <div key={category}>
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide bg-gray-50/80 sticky top-8 z-10">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    {features.map(feature => {
                      const isSelected = selectedFeatures.includes(feature.id)
                      const FeatureIcon = getFeatureIcon(feature.id)
                      return (
                        <label
                          key={feature.id}
                          className={`flex items-center gap-3 px-3 py-2 sm:py-2.5 py-3 cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100 ${
                            isSelected ? 'bg-blue-50/50' : ''
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFeature(feature.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                          />
                          <FeatureIcon className="w-4 h-4 flex-shrink-0 text-gray-500" />
                          <span className={`text-sm flex-1 truncate ${isSelected ? 'text-blue-800 font-medium' : 'text-gray-700'}`}>
                            {feature.name}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 text-sm text-gray-500">No features available</div>
          )}
        </div>
      )}
    </div>
  )
}

// Modal Components
const EditAgentModal: React.FC<{
  agent: SimpleAgent | null
  isOpen: boolean
  onClose: () => void
  onSave: (agent: SimpleAgent) => Promise<void>
  isSaving: boolean
}> = ({ agent, isOpen, onClose, onSave, isSaving }) => {
  const { t } = useTranslation()
  const { vendors, loading: vendorsLoading } = useVendors()
  const { features: agentFeatures, loading: featuresLoading } = useAgentFeatures()
  
  const [formData, setFormData] = useState({
    name: '',
    vendor_id: '',
    service_id: '',
    model_name: '',
    feature_ids: [] as string[],
    notes: ''
  })

  // Reset form when agent changes
  React.useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        vendor_id: agent.vendor_id,
        service_id: agent.service_id || '',
        model_name: agent.model_name || '',
        feature_ids: agent.features.map(f => f.id) || [],
        notes: agent.notes || ''
      })
    }
  }, [agent])

  const handleSave = async () => {
    if (!agent || !formData.name.trim() || !formData.vendor_id || isSaving) return

    const updatedAgent: SimpleAgent = {
      ...agent,
      name: formData.name.trim(),
      vendor_id: formData.vendor_id,
      service_id: formData.service_id || undefined,
      model_name: formData.model_name || undefined,
      features: formData.feature_ids.map(id => agentFeatures?.find(f => f.id === id)).filter(Boolean) as NewAgentFeature[],
      notes: formData.notes.trim() || undefined
    }

    await onSave(updatedAgent)
    onClose()
  }

  const selectedVendor = vendors?.find(v => v.id === formData.vendor_id)
  // Services are fetched separately; vendors currently have no embedded services
  const availableServices: any[] = []

  if (!isOpen || !agent) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full m-4"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{t.agents.modalEditAgentTitle}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t.agents.modalClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.agents.modalNameLabel}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.agents.modalNamePlaceholder}
            />
          </div>

          <VendorSelector
            selectedVendorId={formData.vendor_id}
            selectedServiceId={formData.service_id}
            availableVendors={vendors || []}
            onVendorChange={(vendorId) => setFormData(prev => ({ ...prev, vendor_id: vendorId, service_id: '' }))}
            onServiceChange={(serviceId) => setFormData(prev => ({ ...prev, service_id: serviceId }))}
            loading={vendorsLoading}
            placeholder="Select vendor for this agent..."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
            <input
              type="text"
              value={formData.model_name}
              onChange={(e) => setFormData(prev => ({ ...prev, model_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., gpt-4-turbo, claude-3-sonnet"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t.agents.modalFeaturesLabel}</label>
            <FeaturesMultiSelect
              selectedFeatures={formData.feature_ids}
              availableFeatures={agentFeatures || []}
              onChange={(featureIds) => setFormData(prev => ({ ...prev, feature_ids: featureIds }))}
              loading={featuresLoading}
              placeholder="Select features for this agent..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.agents.modalNotesLabel}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.agents.modalNotesPlaceholder}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            disabled={isSaving}
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.name.trim() || !formData.vendor_id || isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.common.save}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const EditInteractionModal: React.FC<{
  interaction: InteractionItem | null
  agents: SimpleAgent[]
  isOpen: boolean
  onClose: () => void
  onSave: (interaction: InteractionItem) => Promise<void>
  isSaving: boolean
}> = ({ interaction, agents, isOpen, onClose, onSave, isSaving }) => {
  const { t } = useTranslation()
  const { types: interactionTypes, loading: interactionTypesLoading } = useInteractionTypes()
  
  const [formData, setFormData] = useState({
    agent_id: '',
    title: '',
    interaction_type_id: '',
    link: '',
    tags: '',
    total_cost: '',
    satisfaction_rating: '',
    duration_minutes: ''
  })

  // Reset form when interaction changes
  React.useEffect(() => {
    if (interaction) {
      setFormData({
        agent_id: interaction.agent_id,
        title: interaction.title,
        interaction_type_id: interaction.interaction_type_id,
        link: interaction.link || '',
        tags: interaction.tags?.join(', ') || '',
        total_cost: interaction.total_cost?.toString() || '',
        satisfaction_rating: interaction.satisfaction_rating?.toString() || '',
        duration_minutes: interaction.duration_minutes?.toString() || ''
      })
    }
  }, [interaction])

  const handleSave = async () => {
    if (!interaction || !formData.agent_id || !formData.title.trim() || isSaving) return

    const tags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t)

    // Validate URL if provided
    let validLink = undefined
    if (formData.link.trim()) {
      try {
        new URL(formData.link.trim())
        validLink = formData.link.trim()
      } catch {
        // Invalid URL, ignore it
      }
    }

    const updatedInteraction: InteractionItem = {
      ...interaction,
      agent_id: formData.agent_id,
      title: formData.title.trim(),
      interaction_type_id: formData.interaction_type_id || interaction.interaction_type_id,
      link: validLink,
      tags: tags.length > 0 ? tags : [],
      total_cost: formData.total_cost ? parseFloat(formData.total_cost) : undefined,
      satisfaction_rating: formData.satisfaction_rating ? parseInt(formData.satisfaction_rating) : undefined,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined
    }

    await onSave(updatedInteraction)
    onClose()
  }

  if (!isOpen || !interaction) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full m-4"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{t.agents.modalEditInteractionTitle}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label={t.agents.modalClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <ModernAgentSelector
            selectedAgentId={formData.agent_id}
            availableAgents={agents}
            onAgentChange={(agentId) => setFormData(prev => ({ ...prev, agent_id: agentId }))}
            placeholder={t.agents.modalSelectAgent}
            label={t.agents.modalAgentLabel}
          />

          <ModernInteractionTypeSelector
            selectedTypeId={formData.interaction_type_id}
            availableTypes={interactionTypes || []}
            onTypeChange={(typeId) => setFormData(prev => ({ ...prev, interaction_type_id: typeId }))}
            loading={interactionTypesLoading}
            placeholder="Select interaction type..."
            label="Interaction Type"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.agents.modalTitleLabel}</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.agents.modalTitlePlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.agents.modalLinkLabel}</label>
            <input
              type="url"
              value={formData.link}
              onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.agents.modalLinkPlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.agents.modalTagsLabel}</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.agents.modalTagsPlaceholder}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.total_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, total_cost: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.satisfaction_rating}
                onChange={(e) => setFormData(prev => ({ ...prev, satisfaction_rating: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="15"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            disabled={isSaving}
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.agent_id || !formData.title.trim() || isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.common.save}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const ConfirmDeleteModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  isDeleting: boolean
}> = ({ isOpen, onClose, onConfirm, title, description, isDeleting }) => {
  const { t } = useTranslation()
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full m-4"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          
          <p className="text-gray-600 mb-6">{description}</p>
          
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              disabled={isDeleting}
            >
              {t.common.cancel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.common.delete}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Components
const AgentTile: React.FC<{ 
  agent: SimpleAgent
  onEdit?: (agent: SimpleAgent) => void
  onDelete?: (agentId: string) => void
}> = ({ agent, onEdit, onDelete }) => {
  const { t } = useTranslation()
  const VendorIcon = getVendorIcon(agent.vendor_id)
  const colorClass = getVendorColor(agent.vendor_id)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl border-2 ${colorClass} transition-all hover:shadow-md relative group`}
    >
      {/* Action buttons */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {onEdit && (
          <button
            onClick={() => onEdit(agent)}
            className="p-1 bg-white/80 hover:bg-white rounded-full shadow-sm transition-colors"
            aria-label={t.agents.ariaEditAgent}
          >
            <Edit className="w-3 h-3 text-gray-600" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(agent.id)}
            className="p-1 bg-white/80 hover:bg-white rounded-full shadow-sm transition-colors"
            aria-label={t.agents.ariaDeleteAgent}
          >
            <Trash2 className="w-3 h-3 text-red-600" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <VendorIcon className="w-5 h-5" />
        <h3 className="font-bold text-sm">{agent.name}</h3>
        {agent.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
      </div>
      
      {agent.vendor_name && (
        <p className="text-xs text-gray-600 mb-2">{agent.vendor_name}</p>
      )}
      
      <div className="flex flex-wrap gap-1 mb-2">
        {agent.features.map((feature) => {
          const FeatureIcon = getFeatureIcon(feature.id)
          return (
            <span
              key={feature.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/50 rounded-full"
            >
              <FeatureIcon className="w-3 h-3" />
              {feature.name}
            </span>
          )
        })}
      </div>
      
      {/* Analytics section */}
      {(agent.monthly_cost || agent.recent_interactions || agent.avg_satisfaction) && (
        <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
          {agent.monthly_cost && (
            <span className="inline-flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${agent.monthly_cost.toFixed(2)}
            </span>
          )}
          {agent.recent_interactions && (
            <span className="inline-flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {agent.recent_interactions}
            </span>
          )}
          {agent.avg_satisfaction && (
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {agent.avg_satisfaction.toFixed(1)}
            </span>
          )}
        </div>
      )}
      {agent.notes && (
        <p className="text-xs opacity-75">{agent.notes}</p>
      )}
      
      {agent.last_used_at && (
        <p className="text-xs text-gray-500 mt-1">
          <Clock className="w-3 h-3 inline mr-1" />
          {formatDate(agent.last_used_at)}
        </p>
      )}
    </motion.div>
  )
}

const ColumnsView: React.FC<{
  agents: SimpleAgent[]
  onAddAgent: (agentData: Omit<SimpleAgent, 'id'>) => Promise<void>
  onEditAgent?: (agent: SimpleAgent) => void
  onDeleteAgent?: (agentId: string) => void
  isCreating: boolean
}> = ({ agents, onAddAgent, onEditAgent, onDeleteAgent, isCreating }) => {
  const { t } = useTranslation()
  const { vendors, loading: vendorsLoading } = useVendors()
  const { features: agentFeatures, loading: featuresLoading } = useAgentFeatures()
  
  const [newAgent, setNewAgent] = useState({
    name: '',
    vendor_id: '',
    service_id: '',
    model_name: '',
    feature_ids: [] as string[],
    notes: ''
  })

  const handleAddAgent = async () => {
    if (!newAgent.name.trim() || !newAgent.vendor_id || isCreating) return

    const selectedFeatures = newAgent.feature_ids.map(id => agentFeatures?.find(f => f.id === id)).filter(Boolean) as NewAgentFeature[]

    const agentData = {
      vendor_id: newAgent.vendor_id,
      service_id: newAgent.service_id || undefined,
      model_name: newAgent.model_name || undefined,
      name: newAgent.name.trim(),
      features: selectedFeatures,
      notes: newAgent.notes.trim() || undefined,
      activity_score: 0.2,
      usage_count: 0,
      is_favorite: false,
      tags: []
    }

    await onAddAgent(agentData)
    setNewAgent({ name: '', vendor_id: '', service_id: '', model_name: '', feature_ids: [], notes: '' })
  }

  const selectedVendor = vendors?.find(v => v.id === newAgent.vendor_id)
  // Services are fetched separately; vendors currently have no embedded services
  const availableServices: any[] = []

  const agentsByVendor = useMemo(() => {
    const grouped: Record<string, { vendor: Vendor, agents: SimpleAgent[] }> = {}
    
    agents.forEach(agent => {
      const vendorId = agent.vendor_id
      if (!grouped[vendorId]) {
        const vendor = vendors?.find(v => v.id === vendorId)
        if (vendor) {
          grouped[vendorId] = { vendor, agents: [] }
        }
      }
      if (grouped[vendorId]) {
        grouped[vendorId].agents.push(agent)
      }
    })
    
    return grouped
  }, [agents, vendors])

  return (
    <div className="space-y-6">
      {/* Add Agent Row */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg">
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
            <div className="sm:col-span-1 lg:col-span-1">
              <label className="block text-sm font-medium mb-1">{t.agents.name}</label>
              <input
                type="text"
                value={newAgent.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t.agents.agentNamePlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <VendorSelector
                selectedVendorId={newAgent.vendor_id}
                selectedServiceId={newAgent.service_id}
                availableVendors={vendors || []}
                onVendorChange={(vendorId) => setNewAgent(prev => ({ ...prev, vendor_id: vendorId, service_id: '' }))}
                onServiceChange={(serviceId) => setNewAgent(prev => ({ ...prev, service_id: serviceId }))}
                loading={vendorsLoading}
                placeholder="Select vendor..."
              />
            </div>
            
            <div className="sm:col-span-1 lg:col-span-1">
              <label className="block text-sm font-medium mb-1">Features</label>
              <FeaturesMultiSelect
                selectedFeatures={newAgent.feature_ids}
                availableFeatures={agentFeatures || []}
                onChange={(featureIds) => setNewAgent(prev => ({ ...prev, feature_ids: featureIds }))}
                loading={featuresLoading}
                placeholder="Select features..."
                maxHeight="max-h-32 sm:max-h-32 max-h-48"
              />
            </div>
            <div className="sm:col-span-1 lg:col-span-1">
              <label className="block text-sm font-medium mb-1">{t.agents.notes}</label>
              <input
                type="text"
                value={newAgent.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAgent(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t.agents.notesPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-1 lg:col-span-1 xl:col-span-1 flex items-end">
              <button 
                onClick={handleAddAgent}
                disabled={isCreating || !newAgent.vendor_id || !newAgent.name.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isCreating ? t.agents.adding : t.agents.add}</span>
                <span className="sm:hidden">{isCreating ? t.agents.adding : t.agents.add}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Object.entries(agentsByVendor).map(([vendorId, { vendor, agents: vendorAgents }]) => {
          const VendorIcon = getVendorIcon(vendorId)
          
          return (
            <div key={vendorId} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <VendorIcon className="w-4 h-4" />
                {vendor.name}
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {vendorAgents.length}
                </span>
              </div>
              <div className="space-y-2">
                {vendorAgents.map(agent => (
                  <AgentTile 
                    key={agent.id} 
                    agent={agent} 
                    onEdit={onEditAgent}
                    onDelete={onDeleteAgent}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const OrbitView: React.FC<{ agents: SimpleAgent[] }> = ({ agents }) => {
  const centerX = 200
  const centerY = 200
  const radius = 120

  return (
    <div className="flex justify-center">
      <div className="relative w-96 h-96">
        <svg width="400" height="400" className="absolute inset-0">
          {/* Orbit ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          
          {/* Center "Zephyr" */}
          <circle
            cx={centerX}
            cy={centerY}
            r="20"
            fill="#3b82f6"
            className="drop-shadow-sm"
          />
          <text
            x={centerX}
            y={centerY + 5}
            textAnchor="middle"
            className="text-white text-xs font-bold fill-current"
          >
            Zephyr
          </text>
          
          {/* Agent nodes */}
          {agents.map((agent, index) => {
            const angle = (index * 2 * Math.PI) / agents.length
            const x = centerX + radius * Math.cos(angle)
            const y = centerY + radius * Math.sin(angle)
            const nodeSize = 8 + agent.activity_score * 12
            const nodeColor = getVendorColor(agent.vendor_id).includes('indigo') ? '#6366f1' :
                            getVendorColor(agent.vendor_id).includes('emerald') ? '#10b981' :
                            getVendorColor(agent.vendor_id).includes('amber') ? '#f59e0b' : '#6366f1'
            
            return (
              <g key={agent.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={nodeSize}
                  fill={nodeColor}
                  className="drop-shadow-sm"
                />
                {agent.is_favorite && (
                  <circle
                    cx={x + nodeSize - 2}
                    cy={y - nodeSize + 2}
                    r="3"
                    fill="#fbbf24"
                    className="drop-shadow-sm"
                  />
                )}
                <text
                  x={x}
                  y={y + radius + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {agent.name}
                </text>
                <text
                  x={x}
                  y={y + radius + 35}
                  textAnchor="middle"
                  className="text-xs fill-gray-400"
                >
                  {agent.vendor_name || agent.vendor_id}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

const HistoryList: React.FC<{
  history: InteractionItem[]
  agents: SimpleAgent[]
  onAddInteraction: (interactionData: Omit<InteractionItem, 'id'>) => Promise<void>
  onEditInteraction?: (interaction: InteractionItem) => void
  onDeleteInteraction?: (interactionId: string) => void
  isCreating: boolean
}> = ({ history, agents, onAddInteraction, onEditInteraction, onDeleteInteraction, isCreating }) => {
  const { t } = useTranslation()
  const { types: interactionTypes } = useInteractionTypes()
  
  const [newInteraction, setNewInteraction] = useState({
    agent_id: '',
    title: '',
    interaction_type_id: '',
    link: '',
    tags: ''
  })

  const handleAddInteraction = async () => {
    if (!newInteraction.agent_id || !newInteraction.title.trim() || isCreating) return

    const tags = newInteraction.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t)

    // Validate URL if provided
    let validLink = undefined
    if (newInteraction.link.trim()) {
      try {
        new URL(newInteraction.link.trim())
        validLink = newInteraction.link.trim()
      } catch {
        // Invalid URL, ignore it
      }
    }

    const interactionData = {
      agent_id: newInteraction.agent_id,
      title: newInteraction.title.trim(),
      interaction_type_id: newInteraction.interaction_type_id || 'conversation',
      date_iso: new Date().toISOString(),
      link: validLink,
      tags: tags.length > 0 ? tags : []
    }

    await onAddInteraction(interactionData)
    setNewInteraction({ agent_id: '', title: '', interaction_type_id: '', link: '', tags: '' })
  }

  const getAgent = (agentId: string) => agents.find(a => a.id === agentId)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {t.agents.interactionHistory}
        </h3>
      </div>
      <div className="p-6 space-y-4">
        {/* Quick Add */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          {/* First Row: Agent and Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <ModernAgentSelector
              selectedAgentId={newInteraction.agent_id}
              availableAgents={agents}
              onAgentChange={(agentId) => setNewInteraction(prev => ({ ...prev, agent_id: agentId }))}
              placeholder={t.agents.quickAddSelectAgent}
              label={t.agents.quickAddAgentLabel}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t.agents.quickAddTitleLabel}</label>
            <input
              type="text"
              value={newInteraction.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInteraction(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t.agents.quickAddTitlePlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <ModernInteractionTypeSelector
              selectedTypeId={newInteraction.interaction_type_id}
              availableTypes={interactionTypes || []}
              onTypeChange={(typeId) => setNewInteraction(prev => ({ ...prev, interaction_type_id: typeId }))}
              loading={false}
              placeholder="Select type..."
              label="Type"
            />
          </div>
          
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium mb-1">{t.agents.quickAddLinkLabel}</label>
            <input
              type="text"
              value={newInteraction.link}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInteraction(prev => ({ ...prev, link: e.target.value }))}
              placeholder={t.agents.quickAddLinkPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-1 lg:col-span-2 flex items-end">
            <button 
              onClick={handleAddInteraction}
              disabled={isCreating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isCreating ? t.agents.adding : t.agents.add}</span>
              <span className="sm:hidden">{isCreating ? t.agents.adding : t.agents.add}</span>
            </button>
          </div>
        </div>

        {/* Close grid container */}
        </div>

        {/* History List */}
        <div className="space-y-3">
          {history.length === 0 && (
            <div className="p-4 text-sm text-gray-600 bg-white border border-dashed border-gray-300 rounded-lg">
              {t.agents.noInteractions}
            </div>
          )}
          {history.map(interaction => {
            const agent = getAgent(interaction.agent_id)
            const VendorIcon = getVendorIcon(agent?.vendor_id || '')
            
            return (
              <motion.div
                key={interaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow group"
              >
                <div className="p-2 bg-gray-100 rounded-full">
                  <VendorIcon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{interaction.title}</h4>
                  <p className="text-sm text-gray-500">
                    {(agent?.name || interaction.agent_name || 'Unknown Agent')} • {formatDate(interaction.date_iso)}
                  </p>
                  {interaction.total_cost && (
                    <p className="text-xs text-green-600">
                      <DollarSign className="w-3 h-3 inline mr-1" />
                      ${interaction.total_cost.toFixed(3)}
                      {interaction.duration_minutes && ` • ${interaction.duration_minutes}m`}
                    </p>
                  )}
                  {interaction.tags && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {interaction.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {interaction.link && (
                    <a
                      href={interaction.link}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={t.agents.openLink}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t.agents.open}
                    </a>
                  )}
                  
                  {/* Edit and Delete buttons */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {onEditInteraction && (
                      <button
                        onClick={() => onEditInteraction(interaction)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        aria-label={t.agents.ariaEditInteraction}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteInteraction && (
                      <button
                        onClick={() => onDeleteInteraction(interaction.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        aria-label={t.agents.ariaDeleteInteraction}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Main Component
export default function AgentDirectory({
  initialAgents = [],
  initialHistory = [],
  onAddAgent,
  onAddInteraction,
  fullScreenPath
}: AgentDirectoryProps) {
  const { t } = useTranslation()
  // API hooks
  const { 
    agents: apiAgents, 
    loading: agentsLoading, 
    error: agentsError, 
    createAgent: createAIAgent,
    updateAgent: updateAIAgent,
    deleteAgent: deleteAIAgent
  } = useAIAgents()
  
  const { 
    interactions: apiInteractions, 
    loading: interactionsLoading, 
    error: interactionsError, 
    createInteraction: createAIIInteraction,
    updateInteraction: updateAIIInteraction,
    deleteInteraction: deleteAIIInteraction
  } = useAIInteractions()

  // Convert API data to component format
  const agents = useMemo(() => {
    if (apiAgents.length > 0) {
      return apiAgents.map(convertAIAgentToSimpleAgent)
    }
    return initialAgents
  }, [apiAgents, initialAgents])

  const history = useMemo(() => {
    if (apiInteractions.length > 0) {
      return apiInteractions.map(convertAIInteractionToInteractionItem)
    }
    return initialHistory
  }, [apiInteractions, initialHistory])

  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'simple' | 'orbit'>('simple')
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)
  const [isCreatingInteraction, setIsCreatingInteraction] = useState(false)
  
  // Modal states
  const [editingAgent, setEditingAgent] = useState<SimpleAgent | null>(null)
  const [editingInteraction, setEditingInteraction] = useState<InteractionItem | null>(null)
  const [deletingAgent, setDeletingAgent] = useState<string | null>(null)
  const [deletingInteraction, setDeletingInteraction] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter agents and history based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return { agents, history }
    }

    const query = searchQuery.toLowerCase()
    
    const filteredAgents = agents.filter(agent =>
      agent.name.toLowerCase().includes(query) ||
      agent.vendor_name?.toLowerCase().includes(query) ||
      agent.vendor_id.toLowerCase().includes(query) ||
      agent.features.some(f => f.name.toLowerCase().includes(query) || f.category?.toLowerCase().includes(query)) ||
      agent.notes?.toLowerCase().includes(query) ||
      agent.tags.some(tag => tag.toLowerCase().includes(query))
    )

    const filteredHistory = history.filter(interaction => {
      const agent = agents.find(a => a.id === interaction.agent_id)
      return (
        interaction.title.toLowerCase().includes(query) ||
        agent?.name.toLowerCase().includes(query) ||
        agent?.vendor_name?.toLowerCase().includes(query) ||
        agent?.vendor_id.toLowerCase().includes(query) ||
        interaction.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    })

    return { agents: filteredAgents, history: filteredHistory }
  }, [agents, history, searchQuery])

  const handleAddAgent = async (agentData: Omit<SimpleAgent, 'id'>) => {
    setIsCreatingAgent(true)
    try {
      const newAgent = await createAIAgent({
        vendor_id: agentData.vendor_id,
        service_id: agentData.service_id,
        model_name: agentData.model_name,
        name: agentData.name,
        feature_ids: agentData.features.map(f => f.id),
        notes: agentData.notes,
        tags: agentData.tags,
        is_favorite: agentData.is_favorite
      })
      
      if (newAgent) {
        const convertedAgent = convertAIAgentToSimpleAgent(newAgent)
        onAddAgent?.(convertedAgent)
      }
    } catch (error) {
      console.error('Failed to create agent:', error)
    } finally {
      setIsCreatingAgent(false)
    }
  }

  const handleAddInteraction = async (interactionData: Omit<InteractionItem, 'id'>) => {
    setIsCreatingInteraction(true)
    try {
      const newInteraction = await createAIIInteraction({
        agent_id: interactionData.agent_id,
        title: interactionData.title,
        interaction_type_id: interactionData.interaction_type_id || 'conversation',
        started_at: interactionData.date_iso,
        external_link: interactionData.link || undefined,
        tags: interactionData.tags || [],
        total_cost: interactionData.total_cost,
        satisfaction_rating: interactionData.satisfaction_rating,
        duration_minutes: interactionData.duration_minutes
      })
      
      if (newInteraction) {
        const convertedInteraction = convertAIInteractionToInteractionItem(newInteraction)
        onAddInteraction?.(convertedInteraction)
      }
    } catch (error) {
      console.error('Failed to create interaction:', error)
    } finally {
      setIsCreatingInteraction(false)
    }
  }

  // Edit and Delete handlers
  const handleEditAgent = async (updatedAgent: SimpleAgent) => {
    setIsUpdating(true)
    try {
      const result = await updateAIAgent(updatedAgent.id, {
        vendor_id: updatedAgent.vendor_id,
        service_id: updatedAgent.service_id,
        model_name: updatedAgent.model_name,
        name: updatedAgent.name,
        feature_ids: updatedAgent.features.map(f => f.id),
        notes: updatedAgent.notes,
        tags: updatedAgent.tags,
        is_favorite: updatedAgent.is_favorite
      })
      
      if (result) {
        console.log('Agent updated successfully')
      }
    } catch (error) {
      console.error('Failed to update agent:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteAgent = async () => {
    if (!deletingAgent || isDeleting) return
    
    setIsDeleting(true)
    try {
      await deleteAIAgent(deletingAgent)
      setDeletingAgent(null)
    } catch (error) {
      console.error('Failed to delete agent:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditInteraction = async (updatedInteraction: InteractionItem) => {
    setIsUpdating(true)
    try {
      const result = await updateAIIInteraction(updatedInteraction.id, {
        agent_id: updatedInteraction.agent_id,
        title: updatedInteraction.title,
        interaction_type_id: updatedInteraction.interaction_type_id,
        started_at: updatedInteraction.date_iso,
        external_link: updatedInteraction.link || undefined,
        tags: updatedInteraction.tags || [],
        total_cost: updatedInteraction.total_cost,
        satisfaction_rating: updatedInteraction.satisfaction_rating,
        duration_minutes: updatedInteraction.duration_minutes
      })
      
      if (result) {
        console.log('Interaction updated successfully')
      }
    } catch (error) {
      console.error('Failed to update interaction:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteInteraction = async () => {
    if (!deletingInteraction || isDeleting) return
    
    setIsDeleting(true)
    try {
      await deleteAIIInteraction(deletingInteraction)
      setDeletingInteraction(null)
    } catch (error) {
      console.error('Failed to delete interaction:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const activeAgents = agents.filter(a => a.activity_score > 0.6).length
  const isLoading = agentsLoading || interactionsLoading
  const hasError = agentsError || interactionsError

  // Show loading state
  if (isLoading && agents.length === 0 && history.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">{t.agents.loading}</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (hasError && agents.length === 0 && history.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.agents.failedToLoad}</h3>
          <p className="text-gray-600 mb-4">
            {agentsError || interactionsError}
          </p>
          <button
            onClick={() => {
              if (agentsError) window.location.reload()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t.agents.retry}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start justify-between gap-3 w-full sm:w-auto">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t.agents.title}</h2>
              <p className="text-gray-600">{t.agents.subtitle}</p>
            </div>

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
          </div>

          {/* Summary Pills */}
          <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
            {filteredData.agents.length} {t.agents.summaryAgents}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
            {activeAgents} {t.agents.summaryActive}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
            {filteredData.history.length} {t.agents.summaryInteractions}
          </span>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder={t.agents.searchPlaceholder}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('simple')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              viewMode === 'simple' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            {t.agents.viewSimple}
          </button>
          <button
            onClick={() => setViewMode('orbit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              viewMode === 'orbit' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Orbit className="w-4 h-4" />
            {t.agents.viewOrbit}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'simple' ? (
          <motion.div
            key="simple"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ColumnsView
              agents={filteredData.agents}
              onAddAgent={handleAddAgent}
              onEditAgent={setEditingAgent}
              onDeleteAgent={setDeletingAgent}
              isCreating={isCreatingAgent}
            />
          </motion.div>
        ) : (
          <motion.div
            key="orbit"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <OrbitView agents={filteredData.agents} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interaction History */}
      <HistoryList
        history={filteredData.history}
        agents={agents}
        onAddInteraction={handleAddInteraction}
        onEditInteraction={setEditingInteraction}
        onDeleteInteraction={setDeletingInteraction}
        isCreating={isCreatingInteraction}
      />

      {/* Modals */}
      <AnimatePresence>
        {editingAgent && (
          <EditAgentModal
            key="edit-agent-modal"
            agent={editingAgent}
            isOpen={!!editingAgent}
            onClose={() => setEditingAgent(null)}
            onSave={handleEditAgent}
            isSaving={isUpdating}
          />
        )}

        {editingInteraction && (
          <EditInteractionModal
            key="edit-interaction-modal"
            interaction={editingInteraction}
            agents={agents}
            isOpen={!!editingInteraction}
            onClose={() => setEditingInteraction(null)}
            onSave={handleEditInteraction}
            isSaving={isUpdating}
          />
        )}

        {deletingAgent && (
          <ConfirmDeleteModal
            key="delete-agent-modal"
            isOpen={!!deletingAgent}
            onClose={() => setDeletingAgent(null)}
            onConfirm={handleDeleteAgent}
            title={t.agents.deleteAgentTitle}
            description={t.agents.deleteAgentDescription}
            isDeleting={isDeleting}
          />
        )}

        {deletingInteraction && (
          <ConfirmDeleteModal
            key="delete-interaction-modal"
            isOpen={!!deletingInteraction}
            onClose={() => setDeletingInteraction(null)}
            onConfirm={handleDeleteInteraction}
            title={t.agents.deleteInteractionTitle}
            description={t.agents.deleteInteractionDescription}
            isDeleting={isDeleting}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
