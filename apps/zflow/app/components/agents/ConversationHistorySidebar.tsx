'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Search, Clock, Archive, MessageSquare } from 'lucide-react'
import { useConversationHistory, useConversationSearch } from '../../lib/conversation-history'
import { ConversationSummary } from '../../lib/conversation-history/types'
import { ConversationListItem } from './ConversationListItem'
import { ConversationSearch } from './ConversationSearch'
import { useTranslation } from '../../../contexts/LanguageContext'

interface ConversationHistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
  currentSessionId: string | null
  onSelectConversation: (conversation: ConversationSummary) => void
  onCreateNewConversation: () => void
  onHistoryUpdate?: (refreshFn: () => Promise<void>) => void
  className?: string
}

export function ConversationHistorySidebar({
  isOpen,
  onClose,
  userId,
  currentSessionId,
  onSelectConversation,
  onCreateNewConversation,
  onHistoryUpdate,
  className = ''
}: ConversationHistorySidebarProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'recent' | 'archived'>('recent')
  const [searchMode, setSearchMode] = useState(false)
  
  const {
    conversations,
    loading,
    error,
    refreshConversations
  } = useConversationHistory(userId)

  const {
    results: searchResults,
    loading: searchLoading,
    search,
    clearSearch
  } = useConversationSearch(userId)

  // Expose refreshConversations through a ref that parent can access
  useEffect(() => {
    if (onHistoryUpdate) {
      onHistoryUpdate(refreshConversations)
    }
  }, [onHistoryUpdate, refreshConversations])

  // Filter conversations based on active tab
  const filteredConversations = conversations.filter(conv => 
    activeTab === 'archived' ? conv.isArchived : !conv.isArchived
  )

  // Remove duplicates by ID to prevent React key conflicts
  const uniqueConversations = filteredConversations.reduce((unique, conv) => {
    const existingIndex = unique.findIndex(c => c.id === conv.id)
    if (existingIndex >= 0) {
      // Keep the most recent one
      if (conv.updatedAt > unique[existingIndex].updatedAt) {
        unique[existingIndex] = conv
      }
    } else {
      unique.push(conv)
    }
    return unique
  }, [] as ConversationSummary[])

  // Group conversations by time
  const groupedConversations = groupConversationsByTime(uniqueConversations, t)

  const handleSearchSubmit = async (query: string) => {
    if (query.trim()) {
      setSearchMode(true)
      await search(query)
    } else {
      handleSearchClear()
    }
  }

  const handleSearchClear = () => {
    setSearchMode(false)
    clearSearch()
  }

  const handleConversationSelect = (conversation: ConversationSummary) => {
    onSelectConversation(conversation)
    // Don't close sidebar on mobile to allow quick switching
  }

  const handleRefresh = () => {
    refreshConversations()
  }

  if (!isOpen) return null

  return (
    <div className={`absolute inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white/95 backdrop-blur-sm border-r border-gray-200/50 shadow-xl transform transition-transform duration-300 ease-in-out ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <h2 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{t.agents.conversationHistory}</h2>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            onClick={onCreateNewConversation}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
            title={t.agents.newConversation}
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 sm:p-4 border-b border-gray-100/50">
        <ConversationSearch
          onSearch={handleSearchSubmit}
          onClear={handleSearchClear}
          loading={searchLoading}
          placeholder={t.agents.searchConversations}
        />
      </div>

      {/* Tabs */}
      {!searchMode && (
        <div className="flex border-b border-gray-100/50 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'recent'
                ? 'text-blue-600 border-b-2 border-blue-500 bg-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{t.agents.recent}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'archived'
                ? 'text-blue-600 border-b-2 border-blue-500 bg-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            <div className="flex items-center justify-center space-x-1 sm:space-x-2">
              <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{t.agents.archived}</span>
            </div>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4 text-red-600 text-sm bg-red-50 border-b border-red-100">
            <p>Failed to load conversations</p>
            <button 
              onClick={handleRefresh}
              className="text-red-700 hover:text-red-800 underline text-xs"
            >
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div className="p-4">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex space-x-3">
                    <div className="rounded-full bg-gray-200 h-8 w-8"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchMode ? (
          <SearchResults
            results={searchResults}
            loading={searchLoading}
            onSelectConversation={handleConversationSelect}
            currentSessionId={currentSessionId}
          />
        ) : (
          <ConversationGroups
            groups={groupedConversations}
            onSelectConversation={handleConversationSelect}
            currentSessionId={currentSessionId}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  )
}

// Helper component for search results
function SearchResults({ 
  results, 
  loading, 
  onSelectConversation, 
  currentSessionId 
}: {
  results: any[]
  loading: boolean
  onSelectConversation: (conv: ConversationSummary) => void
  currentSessionId: string | null
}) {
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Search className="w-6 h-6 mx-auto mb-2 animate-pulse" />
        <p className="text-sm">Searching...</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No results found</p>
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="text-xs font-medium text-gray-500 px-3 py-2">
        {results.length} result{results.length !== 1 ? 's' : ''}
      </div>
      <div className="space-y-1">
        {results.map((result, index) => (
          <div
            key={`search-result-${result.sessionId}-${result.message.id || index}`}
            className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
            onClick={() => {
              // Convert search result to conversation summary format
              const conversation: ConversationSummary = {
                id: result.sessionId,
                userId: '',
                agentId: '',
                title: result.sessionTitle,
                createdAt: result.message.timestamp,
                updatedAt: result.message.timestamp,
                messageCount: 0,
                lastMessagePreview: result.message.content.substring(0, 100) + '...'
              }
              onSelectConversation(conversation)
            }}
          >
            <div className="font-medium text-sm text-gray-800 mb-1">
              {result.sessionTitle || 'Untitled Conversation'}
            </div>
            <div className="text-xs text-gray-600 line-clamp-2">
              {result.message.content}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {formatRelativeTime(result.message.timestamp)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper component for grouped conversations
function ConversationGroups({ 
  groups, 
  onSelectConversation, 
  currentSessionId,
  onRefresh
}: {
  groups: { [key: string]: ConversationSummary[] }
  onSelectConversation: (conv: ConversationSummary) => void
  currentSessionId: string | null
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const groupOrder = [t.agents.today, t.agents.yesterday, t.agents.thisWeek, t.agents.thisMonth, t.agents.older]
  
  if (Object.keys(groups).length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm mb-2">{t.agents.noConversationsYet}</p>
        <p className="text-xs text-gray-400">{t.agents.startNewConversation}</p>
      </div>
    )
  }

  return (
    <div className="p-2">
      {groupOrder.map(groupName => {
        const conversations = groups[groupName]
        if (!conversations || conversations.length === 0) return null

        return (
          <div key={groupName} className="mb-4">
            <div className="text-xs font-medium text-gray-500 px-3 py-2 sticky top-0 bg-white">
              {groupName} ({conversations.length})
            </div>
            <div className="space-y-1">
              {conversations.map(conversation => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === currentSessionId}
                  onClick={() => onSelectConversation(conversation)}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Helper functions
function groupConversationsByTime(conversations: ConversationSummary[], t: any) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const groups: { [key: string]: ConversationSummary[] } = {
    [t.agents.today]: [],
    [t.agents.yesterday]: [],
    [t.agents.thisWeek]: [],
    [t.agents.thisMonth]: [],
    [t.agents.older]: []
  }

  conversations.forEach(conv => {
    const convDate = conv.updatedAt
    
    if (convDate >= today) {
      groups[t.agents.today].push(conv)
    } else if (convDate >= yesterday) {
      groups[t.agents.yesterday].push(conv)
    } else if (convDate >= weekAgo) {
      groups[t.agents.thisWeek].push(conv)
    } else if (convDate >= monthAgo) {
      groups[t.agents.thisMonth].push(conv)
    } else {
      groups[t.agents.older].push(conv)
    }
  })

  return groups
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}