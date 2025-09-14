'use client'

import React, { useState, useEffect } from 'react'
import { X, Plus, Search, Clock, Archive, MessageSquare } from 'lucide-react'
import { useConversationHistory, useConversationSearch } from '../../lib/conversation-history'
import { ConversationSummary } from '../../lib/conversation-history/types'
import { ConversationListItem } from './ConversationListItem'
import { ConversationSearch } from './ConversationSearch'

interface ConversationHistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
  currentSessionId: string | null
  onSelectConversation: (conversation: ConversationSummary) => void
  onCreateNewConversation: () => void
  className?: string
}

export function ConversationHistorySidebar({
  isOpen,
  onClose,
  userId,
  currentSessionId,
  onSelectConversation,
  onCreateNewConversation,
  className = ''
}: ConversationHistorySidebarProps) {
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
  const groupedConversations = groupConversationsByTime(uniqueConversations)

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
    <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-800">Conversations</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onCreateNewConversation}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <ConversationSearch
          onSearch={handleSearchSubmit}
          onClear={handleSearchClear}
          loading={searchLoading}
          placeholder="Search conversations..."
        />
      </div>

      {/* Tabs */}
      {!searchMode && (
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'recent'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Recent</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'archived'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center space-x-1">
              <Archive className="w-4 h-4" />
              <span>Archived</span>
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
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older']
  
  if (Object.keys(groups).length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm mb-2">No conversations yet</p>
        <p className="text-xs text-gray-400">Start a new conversation to see it here</p>
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
function groupConversationsByTime(conversations: ConversationSummary[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const groups: { [key: string]: ConversationSummary[] } = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'This Month': [],
    'Older': []
  }

  conversations.forEach(conv => {
    const convDate = conv.updatedAt
    
    if (convDate >= today) {
      groups['Today'].push(conv)
    } else if (convDate >= yesterday) {
      groups['Yesterday'].push(conv)
    } else if (convDate >= weekAgo) {
      groups['This Week'].push(conv)
    } else if (convDate >= monthAgo) {
      groups['This Month'].push(conv)
    } else {
      groups['Older'].push(conv)
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