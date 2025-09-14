'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, StopCircle, Plus, Paperclip, Mic, History, Menu } from 'lucide-react'
import { StreamingMessage } from './StreamingMessage'
import { AgentSelector } from './AgentSelector'
import { ConversationHistory } from './ConversationHistory'
import { ConversationHistorySidebar } from './ConversationHistorySidebar'
import { ConversationSummary } from '../../lib/conversation-history/types'
import { useTranslation } from '../../../contexts/LanguageContext'

export interface Message {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  agent?: string
  streaming?: boolean
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  parameters: any
  status: 'pending' | 'running' | 'completed' | 'error'
  result?: any
}

interface AgentChatWindowProps {
  sessionId?: string | null
  messages: Message[]
  selectedAgent: string
  isStreaming: boolean
  userId?: string | null
  availableAgents: Array<{
    id: string
    name: string
    description: string
    status: 'online' | 'offline' | 'busy'
  }>
  onSendMessage: (message: string) => void
  onCancelStream: () => void
  onAgentChange: (agentId: string) => void
  onSelectConversation?: (conversation: ConversationSummary) => void
  onCreateNewConversation?: () => void
  sidebarOpen?: boolean
  onSidebarToggle?: (open: boolean) => void
  refreshHistoryRef?: React.MutableRefObject<(() => Promise<void>) | null>
}

export default function AgentChatWindow({
  sessionId,
  messages,
  selectedAgent,
  isStreaming,
  userId,
  availableAgents,
  onSendMessage,
  onCancelStream,
  onAgentChange,
  onSelectConversation,
  onCreateNewConversation,
  sidebarOpen: externalSidebarOpen,
  onSidebarToggle,
  refreshHistoryRef,
}: AgentChatWindowProps) {
  const { t } = useTranslation()
  const [inputMessage, setInputMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false)
  
  // Use external sidebar control if provided, otherwise use internal state
  const sidebarOpen = externalSidebarOpen !== undefined ? externalSidebarOpen : internalSidebarOpen
  const setSidebarOpen = (open: boolean) => {
    if (onSidebarToggle) {
      onSidebarToggle(open)
    } else {
      setInternalSidebarOpen(open)
    }
  }
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputMessage])

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isStreaming) return
    
    onSendMessage(inputMessage.trim())
    setInputMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const currentAgent = availableAgents.find(agent => agent.id === selectedAgent)

  return (
    <div className="flex h-full relative">
      {/* Conversation History Sidebar */}
      <ConversationHistorySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userId={userId || null}
        currentSessionId={sessionId || null}
        onSelectConversation={(conversation) => {
          onSelectConversation?.(conversation)
          setSidebarOpen(false) // Close sidebar after selection
        }}
        onCreateNewConversation={() => {
          onCreateNewConversation?.()
          setSidebarOpen(false)
        }}
        onHistoryUpdate={(refreshFn) => {
          if (refreshHistoryRef) {
            refreshHistoryRef.current = refreshFn
          }
        }}
      />

      {/* Main Chat Area */}
      <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200 transition-all duration-300 ${
        sidebarOpen ? 'ml-72 sm:ml-80' : 'ml-0'
      } flex-1`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            {/* History Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 sm:p-2.5 text-gray-600 hover:text-gray-800 rounded-lg sm:rounded-xl hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
              title="Toggle conversation history"
            >
              {sidebarOpen ? <Menu size={18} /> : <History size={18} />}
            </button>
            
            <div className="min-w-0 flex-1">
              <AgentSelector
                selectedAgent={selectedAgent}
                availableAgents={availableAgents}
                onAgentChange={onAgentChange}
                disabled={isStreaming}
              />
            </div>
            
            {currentAgent && (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/60 rounded-lg border border-gray-200/50 flex-shrink-0">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  currentAgent.status === 'online' ? 'bg-emerald-500' :
                  currentAgent.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-gray-700 font-medium truncate max-w-32">{currentAgent.description}</span>
              </div>
            )}
          </div>
          <button
            onClick={onCreateNewConversation}
            className="p-2 sm:p-2.5 text-gray-600 hover:text-gray-800 rounded-lg sm:rounded-xl hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
            title="New Chat"
          >
            <Plus size={18} />
          </button>
        </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-white to-primary-50/60">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="relative mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <div className="text-2xl sm:text-4xl">🤖</div>
              </div>
              <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">{t.agents.startConversation}</h3>
            <p className="text-gray-600 mb-4 sm:mb-6 max-w-md text-sm sm:text-base">{t.agents.askAnything}</p>
            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
              <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary-100 text-primary-700 rounded-full text-xs sm:text-sm">{t.agents.taskManagement}</span>
              <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-100 text-slate-700 rounded-full text-xs sm:text-sm">{t.agents.projectPlanning}</span>
              <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-100 text-emerald-700 rounded-full text-xs sm:text-sm">{t.agents.memorySearch}</span>
              <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-100 text-amber-700 rounded-full text-xs sm:text-sm">{t.agents.creativeIdeas}</span>
            </div>
          </div>
        ) : (
          <>
            <ConversationHistory messages={messages} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-6 border-t border-primary-100/60 bg-white/80 backdrop-blur-sm rounded-b-lg">
        {isStreaming && (
          <div className="flex items-center justify-between mb-3 sm:mb-4 p-2 sm:p-3 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg sm:rounded-xl border border-primary-200/60 shadow-sm">
            <div className="flex items-center space-x-2 sm:space-x-3 text-primary-700 min-w-0 flex-1">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-500 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs sm:text-sm font-medium truncate">{currentAgent?.name || 'Agent'} {t.agents.thinking}</span>
            </div>
            <button
              onClick={onCancelStream}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-primary-700 hover:text-primary-800 hover:bg-primary-100/50 rounded-md sm:rounded-lg transition-colors flex-shrink-0"
            >
              <StopCircle size={14} />
              <span className="hidden sm:inline">{t.agents.cancel}</span>
            </button>
          </div>
        )}

        <div className="flex items-end space-x-2 sm:space-x-4">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.agents.askAnythingSimple}
              disabled={isStreaming}
              className="w-full resize-none rounded-xl sm:rounded-2xl border border-gray-200 px-4 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-16 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-[52px] max-h-32 overflow-y-auto shadow-sm transition-all duration-200 text-sm sm:text-base"
              rows={1}
            />
            <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 flex space-x-1 sm:space-x-2">
              <button className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg sm:rounded-xl hover:bg-gray-100 transition-colors">
                <Paperclip size={16} />
              </button>
              <button 
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors ${
                  isRecording 
                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsRecording(!isRecording)}
              >
                <Mic size={16} />
              </button>
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isStreaming}
            className="p-3 sm:p-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl sm:rounded-2xl hover:from-primary-700 hover:to-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex-shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 sm:mt-3 text-xs text-gray-500">
          <span className="hidden sm:inline">{t.agents.pressEnterToSend}，{t.agents.shiftEnterForNewLine}</span>
          <span className="sm:hidden">Enter to send</span>
          {sessionId && (
            <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">{t.agents.session}: {sessionId.slice(-8)}</span>
          )}
        </div>
      </div>
    </div>
  </div>
  )
}
