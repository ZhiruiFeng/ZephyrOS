'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, StopCircle, Settings, Paperclip, Mic } from 'lucide-react'
import { StreamingMessage } from './StreamingMessage'
import { AgentSelector } from './AgentSelector'
import { ConversationHistory } from './ConversationHistory'

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
  availableAgents: Array<{
    id: string
    name: string
    description: string
    status: 'online' | 'offline' | 'busy'
  }>
  onSendMessage: (message: string) => void
  onCancelStream: () => void
  onAgentChange: (agentId: string) => void
}

export default function AgentChatWindow({
  sessionId,
  messages,
  selectedAgent,
  isStreaming,
  availableAgents,
  onSendMessage,
  onCancelStream,
  onAgentChange,
}: AgentChatWindowProps) {
  const [inputMessage, setInputMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
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
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <AgentSelector
            selectedAgent={selectedAgent}
            availableAgents={availableAgents}
            onAgentChange={onAgentChange}
            disabled={isStreaming}
          />
          {currentAgent && (
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                currentAgent.status === 'online' ? 'bg-green-500' :
                currentAgent.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-600">{currentAgent.description}</span>
            </div>
          )}
        </div>
        <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
          <Settings size={20} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm">Ask me about your tasks, projects, or anything else!</p>
          </div>
        ) : (
          <>
            <ConversationHistory messages={messages} />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        {isStreaming && (
          <div className="flex items-center justify-between mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 text-blue-700">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">{currentAgent?.name || 'Agent'} is thinking...</span>
            </div>
            <button
              onClick={onCancelStream}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-700 hover:text-blue-800 hover:bg-blue-100 rounded-lg"
            >
              <StopCircle size={16} />
              <span>Cancel</span>
            </button>
          </div>
        )}

        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your tasks, projects, or memories..."
              disabled={isStreaming}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed min-h-[44px] max-h-32 overflow-y-auto"
              rows={1}
            />
            <div className="absolute bottom-2 right-2 flex space-x-1">
              <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Paperclip size={16} />
              </button>
              <button 
                className={`p-1.5 rounded-lg ${
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
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {sessionId && (
            <span>Session: {sessionId.slice(-8)}</span>
          )}
        </div>
      </div>
    </div>
  )
}