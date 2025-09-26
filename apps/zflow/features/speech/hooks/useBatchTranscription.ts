'use client'

// =====================================================
// Speech Feature - Batch Transcription Hook
// =====================================================

import { useState, useCallback, useEffect } from 'react'
import type { 
  BatchTranscriptionItem, 
  BatchTranscriptionState,
  UseBatchTranscriptionReturn,
  SpeechTranscriptionResult 
} from '../types/speech'

// =====================================================
// Batch Transcription Hook
// =====================================================

export function useBatchTranscription(): UseBatchTranscriptionReturn {
  const [state, setState] = useState<BatchTranscriptionState>({
    items: [],
    isProcessing: false,
    currentItem: null,
    totalDuration: 0,
    error: null
  })

  // Load items from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('speech-batch-items')
      if (stored) {
        const parsed = JSON.parse(stored) as BatchTranscriptionItem[]
        const totalDuration = parsed.reduce((sum, item) => sum + item.duration, 0)
        setState(prev => ({
          ...prev,
          items: parsed,
          totalDuration
        }))
      }
    } catch (error) {
      console.error('Failed to load batch transcription items:', error)
    }
  }, [])

  // Save items to localStorage whenever items change
  useEffect(() => {
    if (state.items.length > 0) {
      try {
        localStorage.setItem('speech-batch-items', JSON.stringify(state.items))
      } catch (error) {
        console.error('Failed to save batch transcription items:', error)
      }
    }
  }, [state.items])

  // Add new transcription item
  const addItem = useCallback((itemData: Omit<BatchTranscriptionItem, 'id' | 'timestamp' | 'status'>) => {
    const newItem: BatchTranscriptionItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'pending'
    }

    setState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
      totalDuration: prev.totalDuration + newItem.duration,
      error: null
    }))
  }, [])

  // Remove transcription item
  const removeItem = useCallback((id: string) => {
    setState(prev => {
      const itemToRemove = prev.items.find(item => item.id === id)
      const newItems = prev.items.filter(item => item.id !== id)
      const newTotalDuration = itemToRemove 
        ? prev.totalDuration - itemToRemove.duration 
        : prev.totalDuration

      return {
        ...prev,
        items: newItems,
        totalDuration: newTotalDuration
      }
    })
  }, [])

  // Update transcription item
  const updateItem = useCallback((id: string, updates: Partial<BatchTranscriptionItem>) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }))
  }, [])

  // Process all pending items
  const processItems = useCallback(async () => {
    const pendingItems = state.items.filter(item => item.status === 'pending')
    
    if (pendingItems.length === 0) {
      return
    }

    setState(prev => ({
      ...prev,
      isProcessing: true,
      error: null
    }))

    try {
      for (const item of pendingItems) {
        setState(prev => ({
          ...prev,
          currentItem: item.id
        }))

        // Update item status to processing
        updateItem(item.id, { status: 'processing' })

        try {
          // Simulate transcription processing
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

          // Mock transcription result
          const mockResult: SpeechTranscriptionResult = {
            text: `Transcribed text for item: ${item.text}`,
            confidence: 0.85 + Math.random() * 0.1,
            language: item.language,
            duration: item.duration,
            timestamp: new Date().toISOString()
          }

          // Update item with result
          updateItem(item.id, {
            status: 'completed',
            text: mockResult.text,
            confidence: mockResult.confidence
          })

        } catch (itemError) {
          // Update item with error
          updateItem(item.id, {
            status: 'error',
            error: itemError instanceof Error ? itemError.message : 'Unknown error'
          })
        }
      }

      setState(prev => ({
        ...prev,
        currentItem: null
      }))

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to process items',
        isProcessing: false,
        currentItem: null
      }))
    } finally {
      setState(prev => ({
        ...prev,
        isProcessing: false
      }))
    }
  }, [state.items, updateItem])

  // Clear all items
  const clearAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      items: [],
      totalDuration: 0,
      currentItem: null,
      error: null
    }))
    
    // Clear from localStorage
    try {
      localStorage.removeItem('speech-batch-items')
    } catch (error) {
      console.error('Failed to clear batch transcription items from storage:', error)
    }
  }, [])

  return {
    state,
    addItem,
    removeItem,
    processItems,
    clearAll,
    updateItem
  }
}
