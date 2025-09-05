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
  Orbit
} from 'lucide-react'

// Types
export type AgentVendor = "ChatGPT" | "Claude" | "Perplexity" | "ElevenLabs" | "Toland" | "Other"
export type AgentFeature = "Brainstorming" | "Daily Q&A" | "Coding" | "MCP" | "News Search" | "Comet" | "TTS" | "STT" | "Companion" | "Speech"

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

interface AgentDirectoryProps {
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
    id: '1',
    vendor: 'ChatGPT',
    name: 'GPT-4',
    features: ['Brainstorming', 'Daily Q&A', 'Coding'],
    notes: 'Main brainstorming partner',
    activityScore: 0.9
  },
  {
    id: '2',
    vendor: 'Claude',
    name: 'Claude Sonnet',
    features: ['Coding', 'MCP'],
    notes: 'Code review and MCP integration',
    activityScore: 0.8
  },
  {
    id: '3',
    vendor: 'Perplexity',
    name: 'Pro Search',
    features: ['News Search'],
    notes: 'Real-time information',
    activityScore: 0.6
  },
  {
    id: '4',
    vendor: 'ElevenLabs',
    name: 'Voice Clone',
    features: ['TTS', 'STT'],
    notes: 'Voice synthesis',
    activityScore: 0.4
  },
  {
    id: '5',
    vendor: 'Toland',
    name: 'AI Companion',
    features: ['Companion', 'Speech'],
    notes: 'Daily companion',
    activityScore: 0.7
  }
]

const DEMO_HISTORY: InteractionItem[] = [
  {
    id: '1',
    agentId: '1',
    title: 'Product strategy brainstorming',
    dateISO: '2024-01-15T10:30:00Z',
    link: 'https://chat.openai.com/share/abc123',
    tags: ['strategy', 'product']
  },
  {
    id: '2',
    agentId: '2',
    title: 'Code review for React components',
    dateISO: '2024-01-14T15:45:00Z',
    tags: ['code', 'react']
  },
  {
    id: '3',
    agentId: '3',
    title: 'Latest AI news research',
    dateISO: '2024-01-14T09:20:00Z',
    link: 'https://perplexity.ai/search/xyz789'
  },
  {
    id: '4',
    agentId: '5',
    title: 'Daily check-in conversation',
    dateISO: '2024-01-13T18:00:00Z',
    tags: ['daily', 'companion']
  }
]

// Utility functions
const formatDate = (dateISO: string) => {
  return new Date(dateISO).toLocaleString()
}

const generateId = () => Math.random().toString(36).substr(2, 9)

// Components
const AgentTile: React.FC<{ agent: SimpleAgent }> = ({ agent }) => {
  const VendorIcon = VENDOR_ICONS[agent.vendor]
  const colorClass = VENDOR_COLORS[agent.vendor]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl border-2 ${colorClass} transition-all hover:shadow-md`}
    >
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
  onAddAgent: (agent: SimpleAgent) => void
}> = ({ agents, onAddAgent }) => {
  const [newAgent, setNewAgent] = useState({
    name: '',
    vendor: 'ChatGPT' as AgentVendor,
    features: '',
    notes: ''
  })

  const handleAddAgent = () => {
    if (!newAgent.name.trim()) return

    const features = newAgent.features
      .split(',')
      .map(f => f.trim())
      .filter(f => f) as AgentFeature[]

    const agent: SimpleAgent = {
      id: generateId(),
      vendor: newAgent.vendor,
      name: newAgent.name.trim(),
      features,
      notes: newAgent.notes.trim() || undefined,
      activityScore: 0.2
    }

    onAddAgent(agent)
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
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={newAgent.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Agent name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vendor</label>
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
              <label className="block text-sm font-medium mb-1">Features</label>
              <input
                type="text"
                value={newAgent.features}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAgent(prev => ({ ...prev, features: e.target.value }))}
                placeholder="Coding, Brainstorming"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <input
                type="text"
                value={newAgent.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAgent(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={handleAddAgent} 
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4" />
              Add
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
                  <AgentTile key={agent.id} agent={agent} />
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
  onAddInteraction: (interaction: InteractionItem) => void
}> = ({ history, agents, onAddInteraction }) => {
  const [newInteraction, setNewInteraction] = useState({
    agentId: '',
    title: '',
    link: '',
    tags: ''
  })

  const handleAddInteraction = () => {
    if (!newInteraction.agentId || !newInteraction.title.trim()) return

    const tags = newInteraction.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t)

    const interaction: InteractionItem = {
      id: generateId(),
      agentId: newInteraction.agentId,
      title: newInteraction.title.trim(),
      dateISO: new Date().toISOString(),
      link: newInteraction.link.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined
    }

    onAddInteraction(interaction)
    setNewInteraction({ agentId: '', title: '', link: '', tags: '' })
  }

  const getAgent = (agentId: string) => agents.find(a => a.id === agentId)

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Interaction History
        </h3>
      </div>
      <div className="p-6 space-y-4">
        {/* Quick Add */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Agent</label>
            <select
              value={newInteraction.agentId}
              onChange={(e) => setNewInteraction(prev => ({ ...prev, agentId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select agent</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={newInteraction.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInteraction(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What was this about?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Link (optional)</label>
            <input
              type="text"
              value={newInteraction.link}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInteraction(prev => ({ ...prev, link: e.target.value }))}
              placeholder="Share/revisit URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleAddInteraction} 
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4" />
              Add
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
                className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
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
                {interaction.link && (
                  <a
                    href={interaction.link}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open link"
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                )}
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
  const [agents, setAgents] = useState<SimpleAgent[]>(initialAgents)
  const [history, setHistory] = useState<InteractionItem[]>(initialHistory)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'simple' | 'orbit'>('simple')

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

  const handleAddAgent = (agent: SimpleAgent) => {
    setAgents(prev => [...prev, agent])
    onAddAgent?.(agent)
  }

  const handleAddInteraction = (interaction: InteractionItem) => {
    setHistory(prev => [interaction, ...prev])
    onAddInteraction?.(interaction)
  }

  const activeAgents = agents.filter(a => a.activityScore > 0.6).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Agents</h2>
          <p className="text-gray-600">Manage your AI agent ecosystem</p>
        </div>
        
        {/* Summary Pills */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
            {filteredData.agents.length} Agents
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
            {activeAgents} Active
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
            {filteredData.history.length} Interactions
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
              placeholder="Search agents, features, or interactions..."
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
            Simple
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
            Orbit
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
      />
    </div>
  )
}
