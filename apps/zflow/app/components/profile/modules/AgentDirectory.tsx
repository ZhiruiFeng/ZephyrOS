// npm i lucide-react framer-motion recharts
// shadcn/ui already installed in host app providing Card/Button/Input

'use client'

import React, { useState, useMemo } from 'react'
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
  X
} from 'lucide-react'
import { useAIAgents, useAIInteractions, type AIAgent, type AIInteraction } from '../../../../hooks/useAIAgents'
import { useTranslation } from '../../../../contexts/LanguageContext'

// Types
export type AgentVendor = "ChatGPT" | "Claude" | "Perplexity" | "ElevenLabs" | "Toland" | "Other"
export type AgentFeature = "Brainstorming" | "Daily Q&A" | "Coding" | "MCP" | "News Search" | "Comet" | "TTS" | "STT" | "Companion" | "Speech"

// Legacy types for backward compatibility
export interface SimpleAgent {
  id: string
  vendor: AgentVendor
  name: string
  features: AgentFeature[]
  notes?: string
  activityScore: number
}

export interface InteractionItem {
  id: string
  agentId: string
  title: string
  dateISO: string
  link?: string
  tags?: string[]
}

// Convert API types to component types
const convertAIAgentToSimpleAgent = (agent: AIAgent): SimpleAgent => ({
  id: agent.id,
  vendor: agent.vendor,
  name: agent.name,
  features: agent.features,
  notes: agent.notes,
  activityScore: agent.activity_score
})

const convertAIInteractionToInteractionItem = (interaction: AIInteraction): InteractionItem => ({
  id: interaction.id,
  agentId: interaction.agent_id,
  title: interaction.title,
  dateISO: interaction.started_at,
  link: interaction.external_link,
  tags: interaction.tags
})

interface AgentDirectoryProps {
  // Legacy props for backward compatibility
  initialAgents?: SimpleAgent[]
  initialHistory?: InteractionItem[]
  onAddAgent?: (agent: SimpleAgent) => void
  onAddInteraction?: (interaction: InteractionItem) => void
}

// Helper maps
const VENDOR_ICONS: Record<AgentVendor, React.ComponentType<{ className?: string }>> = {
  ChatGPT: Bot,
  Claude: MessageSquare,
  Perplexity: SearchIcon,
  ElevenLabs: Volume2,
  Toland: Users,
  Other: Bot
}

const VENDOR_COLORS: Record<AgentVendor, string> = {
  ChatGPT: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  Claude: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  Perplexity: 'bg-amber-50 border-amber-200 text-amber-800',
  ElevenLabs: 'bg-sky-50 border-sky-200 text-sky-800',
  Toland: 'bg-rose-50 border-rose-200 text-rose-800',
  Other: 'bg-slate-50 border-slate-200 text-slate-800'
}

const FEATURE_ICONS: Record<AgentFeature, React.ComponentType<{ className?: string }>> = {
  "Brainstorming": Zap,
  "Daily Q&A": MessageCircle,
  "Coding": Code,
  "MCP": Bot,
  "News Search": Newspaper,
  "Comet": Zap,
  "TTS": Volume2,
  "STT": Mic,
  "Companion": Users,
  "Speech": MessageCircle
}

// Demo data
const DEMO_AGENTS: SimpleAgent[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    vendor: 'ChatGPT',
    name: 'GPT-4',
    features: ['Brainstorming', 'Daily Q&A', 'Coding'],
    notes: 'Main brainstorming partner',
    activityScore: 0.9
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    vendor: 'Claude',
    name: 'Claude Sonnet',
    features: ['Coding', 'MCP'],
    notes: 'Code review and MCP integration',
    activityScore: 0.8
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    vendor: 'Perplexity',
    name: 'Pro Search',
    features: ['News Search'],
    notes: 'Real-time information',
    activityScore: 0.6
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    vendor: 'ElevenLabs',
    name: 'Voice Clone',
    features: ['TTS', 'STT'],
    notes: 'Voice synthesis',
    activityScore: 0.4
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    vendor: 'Toland',
    name: 'AI Companion',
    features: ['Companion', 'Speech'],
    notes: 'Daily companion',
    activityScore: 0.7
  }
]

const DEMO_HISTORY: InteractionItem[] = [
  {
    id: '650e8400-e29b-41d4-a716-446655440001',
    agentId: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Product strategy brainstorming',
    dateISO: '2024-01-15T10:30:00Z',
    link: 'https://chat.openai.com/share/abc123',
    tags: ['strategy', 'product']
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440002',
    agentId: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Code review for React components',
    dateISO: '2024-01-14T15:45:00Z',
    tags: ['code', 'react']
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440003',
    agentId: '550e8400-e29b-41d4-a716-446655440003',
    title: 'Latest AI news research',
    dateISO: '2024-01-14T09:20:00Z',
    link: 'https://perplexity.ai/search/xyz789'
  },
  {
    id: '650e8400-e29b-41d4-a716-446655440004',
    agentId: '550e8400-e29b-41d4-a716-446655440005',
    title: 'Daily check-in conversation',
    dateISO: '2024-01-13T18:00:00Z',
    tags: ['daily', 'companion']
  }
]

// Utility functions
const formatDate = (dateISO: string) => {
  return new Date(dateISO).toLocaleString()
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
  const [formData, setFormData] = useState({
    name: '',
    vendor: 'ChatGPT' as AgentVendor,
    features: '',
    notes: ''
  })

  const vendors: AgentVendor[] = ['ChatGPT', 'Claude', 'Perplexity', 'ElevenLabs', 'Toland', 'Other']

  // Reset form when agent changes
  React.useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        vendor: agent.vendor,
        features: agent.features.join(', '),
        notes: agent.notes || ''
      })
    }
  }, [agent])

  const handleSave = async () => {
    if (!agent || !formData.name.trim() || isSaving) return

    const features = formData.features
      .split(',')
      .map(f => f.trim())
      .filter(f => f) as AgentFeature[]

    const updatedAgent: SimpleAgent = {
      ...agent,
      name: formData.name.trim(),
      vendor: formData.vendor,
      features,
      notes: formData.notes.trim() || undefined
    }

    await onSave(updatedAgent)
    onClose()
  }

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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.agents.modalVendorLabel}</label>
            <select
              value={formData.vendor}
              onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value as AgentVendor }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {vendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.agents.modalFeaturesLabel}</label>
            <input
              type="text"
              value={formData.features}
              onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t.agents.modalFeaturesPlaceholder}
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
            disabled={!formData.name.trim() || isSaving}
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
  const [formData, setFormData] = useState({
    agentId: '',
    title: '',
    link: '',
    tags: ''
  })

  // Reset form when interaction changes
  React.useEffect(() => {
    if (interaction) {
      setFormData({
        agentId: interaction.agentId,
        title: interaction.title,
        link: interaction.link || '',
        tags: interaction.tags?.join(', ') || ''
      })
    }
  }, [interaction])

  const handleSave = async () => {
    if (!interaction || !formData.agentId || !formData.title.trim() || isSaving) return

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
      agentId: formData.agentId,
      title: formData.title.trim(),
      link: validLink,
      tags: tags.length > 0 ? tags : undefined
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.agents.modalAgentLabel}</label>
            <select
              value={formData.agentId}
              onChange={(e) => setFormData(prev => ({ ...prev, agentId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.agents.modalSelectAgent}</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.vendor} - {agent.name}
                </option>
              ))}
            </select>
          </div>

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
            disabled={!formData.agentId || !formData.title.trim() || isSaving}
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
  const VendorIcon = VENDOR_ICONS[agent.vendor]
  const colorClass = VENDOR_COLORS[agent.vendor]
  
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
      </div>
      <div className="flex flex-wrap gap-1">
        {agent.features.map((feature) => {
          const FeatureIcon = FEATURE_ICONS[feature]
          return (
            <span
              key={feature}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-white/50 rounded-full"
            >
              <FeatureIcon className="w-3 h-3" />
              {feature}
            </span>
          )
        })}
      </div>
      {agent.notes && (
        <p className="text-xs mt-2 opacity-75">{agent.notes}</p>
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
  const [newAgent, setNewAgent] = useState({
    name: '',
    vendor: 'ChatGPT' as AgentVendor,
    features: '',
    notes: ''
  })

  const handleAddAgent = async () => {
    if (!newAgent.name.trim() || isCreating) return

    const features = newAgent.features
      .split(',')
      .map(f => f.trim())
      .filter(f => f) as AgentFeature[]

    const agentData = {
      vendor: newAgent.vendor,
      name: newAgent.name.trim(),
      features,
      notes: newAgent.notes.trim() || undefined,
      activityScore: 0.2
    }

    await onAddAgent(agentData)
    setNewAgent({ name: '', vendor: 'ChatGPT', features: '', notes: '' })
  }

  const vendors: AgentVendor[] = ['ChatGPT', 'Claude', 'Perplexity', 'ElevenLabs', 'Toland', 'Other']
  const agentsByVendor = useMemo(() => {
    const grouped: Record<AgentVendor, SimpleAgent[]> = {
      ChatGPT: [],
      Claude: [],
      Perplexity: [],
      ElevenLabs: [],
      Toland: [],
      Other: []
    }
    agents.forEach(agent => {
      grouped[agent.vendor].push(agent)
    })
    return grouped
  }, [agents])

  return (
    <div className="space-y-6">
      {/* Add Agent Row */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">{t.agents.name}</label>
              <input
                type="text"
                value={newAgent.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t.agents.agentNamePlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.agents.vendor}</label>
              <select
                value={newAgent.vendor}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewAgent(prev => ({ ...prev, vendor: e.target.value as AgentVendor }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {vendors.map(vendor => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.agents.features}</label>
              <input
                type="text"
                value={newAgent.features}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAgent(prev => ({ ...prev, features: e.target.value }))}
                placeholder={t.agents.featuresPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t.agents.notes}</label>
              <input
                type="text"
                value={newAgent.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAgent(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t.agents.notesPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={handleAddAgent}
              disabled={isCreating}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isCreating ? t.agents.adding : t.agents.add}
            </button>
          </div>
        </div>
      </div>

      {/* Vendor Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {vendors.map(vendor => {
          const vendorAgents = agentsByVendor[vendor]
          const VendorIcon = VENDOR_ICONS[vendor]
          
          return (
            <div key={vendor} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <VendorIcon className="w-4 h-4" />
                {vendor}
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
            const nodeSize = 8 + agent.activityScore * 12
            
            return (
              <g key={agent.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={nodeSize}
                  fill="#6366f1"
                  className="drop-shadow-sm"
                />
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
                  {agent.vendor}
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
  const [newInteraction, setNewInteraction] = useState({
    agentId: '',
    title: '',
    link: '',
    tags: ''
  })

  const handleAddInteraction = async () => {
    if (!newInteraction.agentId || !newInteraction.title.trim() || isCreating) return

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
      agentId: newInteraction.agentId,
      title: newInteraction.title.trim(),
      dateISO: new Date().toISOString(),
      link: validLink,
      tags: tags.length > 0 ? tags : undefined
    }

    await onAddInteraction(interactionData)
    setNewInteraction({ agentId: '', title: '', link: '', tags: '' })
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1">{t.agents.quickAddAgentLabel}</label>
            <select
              value={newInteraction.agentId}
              onChange={(e) => setNewInteraction(prev => ({ ...prev, agentId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t.agents.quickAddSelectAgent}</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
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
            <label className="block text-sm font-medium mb-1">{t.agents.quickAddLinkLabel}</label>
            <input
              type="text"
              value={newInteraction.link}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInteraction(prev => ({ ...prev, link: e.target.value }))}
              placeholder={t.agents.quickAddLinkPlaceholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleAddInteraction}
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isCreating ? t.agents.adding : t.agents.add}
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {history.map(interaction => {
            const agent = getAgent(interaction.agentId)
            if (!agent) return null

            const VendorIcon = VENDOR_ICONS[agent.vendor]
            
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
                    {agent.name} • {formatDate(interaction.dateISO)}
                  </p>
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
  initialAgents = DEMO_AGENTS,
  initialHistory = DEMO_HISTORY,
  onAddAgent,
  onAddInteraction
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
      agent.vendor.toLowerCase().includes(query) ||
      agent.features.some(f => f.toLowerCase().includes(query)) ||
      agent.notes?.toLowerCase().includes(query)
    )

    const filteredHistory = history.filter(interaction => {
      const agent = agents.find(a => a.id === interaction.agentId)
      return (
        interaction.title.toLowerCase().includes(query) ||
        agent?.name.toLowerCase().includes(query) ||
        agent?.vendor.toLowerCase().includes(query) ||
        interaction.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    })

    return { agents: filteredAgents, history: filteredHistory }
  }, [agents, history, searchQuery])

  const handleAddAgent = async (agentData: Omit<SimpleAgent, 'id'>) => {
    setIsCreatingAgent(true)
    try {
      const newAgent = await createAIAgent({
        vendor: agentData.vendor,
        name: agentData.name,
        features: agentData.features,
        notes: agentData.notes,
        activity_score: agentData.activityScore
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
        agent_id: interactionData.agentId,
        title: interactionData.title,
        started_at: interactionData.dateISO,
        external_link: interactionData.link || undefined,
        tags: interactionData.tags || [],
        interaction_type: 'conversation'
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
        vendor: updatedAgent.vendor,
        name: updatedAgent.name,
        features: updatedAgent.features,
        notes: updatedAgent.notes,
        activity_score: updatedAgent.activityScore
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
        agent_id: updatedInteraction.agentId,
        title: updatedInteraction.title,
        started_at: updatedInteraction.dateISO,
        external_link: updatedInteraction.link || undefined,
        tags: updatedInteraction.tags || [],
        interaction_type: 'conversation'
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

  const activeAgents = agents.filter(a => a.activityScore > 0.6).length
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.agents.title}</h2>
          <p className="text-gray-600">{t.agents.subtitle}</p>
        </div>
        
        {/* Summary Pills */}
        <div className="flex flex-wrap gap-2">
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
  )
}
