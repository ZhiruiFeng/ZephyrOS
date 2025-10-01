'use client'

import React, { useState } from 'react'
import { MoreHorizontal, Edit2, Archive, Trash2, MessageSquare, Bot } from 'lucide-react'
import { ConversationSummary } from '../types/conversation-history'
import { useConversationActions } from '../hooks/conversation-history'

interface ConversationListItemProps {
  conversation: ConversationSummary
  isActive: boolean
  onClick: () => void
  onRefresh?: () => void
}

export function ConversationListItem({ 
  conversation, 
  isActive, 
  onClick,
  onRefresh 
}: ConversationListItemProps) {
  const [showActions, setShowActions] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title || '')
  const [isDeleting, setIsDeleting] = useState(false)

  const { 
    loading, 
    deleteConversation, 
    archiveConversation,
    renameConversation 
  } = useConversationActions(conversation.userId)

  const handleEdit = async () => {
    if (!editTitle.trim()) return
    
    try {
      await renameConversation(conversation.id, editTitle.trim())
      setIsEditing(false)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to rename conversation:', error)
    }
  }

  const handleArchive = async () => {
    try {
      await archiveConversation(conversation.id)
      setShowActions(false)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to archive conversation:', error)
    }
  }

  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true)
      return
    }

    try {
      await deleteConversation(conversation.id)
      setShowActions(false)
      onRefresh?.()
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEdit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditTitle(conversation.title || '')
    }
  }

  const getAgentIcon = (agentId: string) => {
    if (!agentId) {
      return <Bot className="w-6 h-6 text-gray-400" />
    }
    if (agentId.includes('gpt')) {
      return <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold">G</div>
    } else if (agentId.includes('claude')) {
      return <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold">C</div>
    }
    return <Bot className="w-6 h-6 text-gray-400" />
  }

  return (
    <div 
      className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
        isActive 
          ? 'bg-blue-50 border border-blue-200 shadow-sm' 
          : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'
      }`}
      onClick={onClick}
    >
      {/* Main Content */}
      <div className="flex items-start space-x-3">
        {/* Agent Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getAgentIcon(conversation.agentId)}
        </div>

        {/* Conversation Info */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center justify-between mb-1">
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleEdit}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-b border-blue-300 focus:outline-none focus:border-blue-500 mr-2"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className={`text-sm font-medium truncate ${
                isActive ? 'text-blue-800' : 'text-gray-800'
              }`}>
                {conversation.title || 'Untitled Conversation'}
              </h3>
            )}

            {/* Actions Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowActions(!showActions)
                }}
                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  showActions ? 'opacity-100' : ''
                } hover:bg-gray-200`}
              >
                <MoreHorizontal className="w-4 h-4 text-gray-500" />
              </button>

              {/* Actions Menu */}
              {showActions && (
                <div className="absolute right-0 top-8 z-10 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(true)
                      setShowActions(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Rename</span>
                  </button>
                  
                  {!conversation.isArchived && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleArchive()
                      }}
                      disabled={loading}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archive</span>
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete()
                    }}
                    disabled={loading}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 disabled:opacity-50 ${
                      isDeleting 
                        ? 'text-red-700 bg-red-50 hover:bg-red-100' 
                        : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeleting ? 'Confirm Delete' : 'Delete'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview & Meta */}
          <div className="space-y-1">
            {conversation.lastMessagePreview && (
              <p className="text-xs text-gray-600 line-clamp-2">
                {conversation.lastMessagePreview}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center space-x-2">
                <span>{conversation.agentName}</span>
                {conversation.messageCount > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>{conversation.messageCount}</span>
                    </div>
                  </>
                )}
              </div>
              <span>
                {formatRelativeTime(conversation.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r"></div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Click away handler for actions menu */}
      {showActions && (
        <div 
          className="fixed inset-0 z-5"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  )
}

// Helper function for relative time formatting
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