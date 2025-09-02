'use client'

import React from 'react'
import { 
  Heart, 
  Tag, 
  Calendar, 
  MapPin, 
  Pencil, 
  Trash2, 
  Star, 
  MessageSquare, 
  Link,
  FileText,
  Lightbulb,
  Quote,
  Brain,
  ChevronDown,
  Info,
  Smile,
  Meh,
  Frown
} from 'lucide-react'
import { Memory } from '../../types/memory'

export type MemoryCardVariant = 'timeline' | 'search' | 'collection'

interface MemoryCardProps {
  memory: Memory
  variant: MemoryCardVariant
  displayMode: 'list' | 'grid'
  expandedDescriptions: Set<string>
  
  // Event handlers
  onMemoryClick: (memoryId: string) => void
  onEditMemory: (memory: Memory) => void
  onDeleteMemory: (memoryId: string) => void
  onToggleHighlight: (memory: Memory) => void
  onToggleDescription: (memoryId: string) => void
  onTagClick?: (tag: string) => void
}

export default function MemoryCard({
  memory,
  variant,
  displayMode,
  expandedDescriptions,
  onMemoryClick,
  onEditMemory,
  onDeleteMemory,
  onToggleHighlight,
  onToggleDescription,
  onTagClick
}: MemoryCardProps) {
  
  // Get memory type icon
  const getMemoryTypeIcon = () => {
    const iconClass = "w-4 h-4"
    switch (memory.memory_type) {
      case 'note':
        return <MessageSquare className={iconClass} />
      case 'link':
        return <Link className={iconClass} />
      case 'file':
        return <FileText className={iconClass} />
      case 'thought':
        return <Brain className={iconClass} />
      case 'quote':
        return <Quote className={iconClass} />
      case 'insight':
        return <Lightbulb className={iconClass} />
      default:
        return <MessageSquare className={iconClass} />
    }
  }

  // Get emotion indicator
  const getEmotionIndicator = () => {
    if (memory.emotion_valence === null || memory.emotion_valence === undefined) {
      return <Meh className="w-4 h-4 text-gray-400" />
    }

    if (memory.emotion_valence >= 2) {
      return <Smile className="w-4 h-4 text-green-500" />
    } else if (memory.emotion_valence <= -2) {
      return <Frown className="w-4 h-4 text-red-500" />
    } else {
      return <Meh className="w-4 h-4 text-yellow-500" />
    }
  }

  // Get importance color based on salience_score (since importance_level doesn't exist in DB)
  const getImportanceColor = () => {
    const salience = memory.salience_score || 0
    if (salience > 0.7) {
      return 'border-red-300 bg-red-50'
    } else if (salience > 0.3) {
      return 'border-yellow-300 bg-yellow-50'  
    } else {
      return 'border-green-300 bg-green-50'
    }
  }
  
  // Get importance label based on salience_score
  const getImportanceLevel = () => {
    const salience = memory.salience_score || 0
    if (salience > 0.7) return 'high'
    if (salience > 0.3) return 'medium'
    return 'low'
  }

  // Get card styling based on state
  const getCardStyling = () => {
    if (memory.is_highlight) {
      return 'bg-gradient-to-r from-amber-50 to-orange-100 border-2 border-amber-300 shadow-lg shadow-amber-200/60 hover:shadow-xl hover:shadow-amber-200/70'
    }
    return 'bg-white/70 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200'
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString()
  }

  // Get display title
  const getDisplayTitle = () => {
    if (memory.title) return memory.title  // Use title instead of title_override
    
    // Generate title from first line of note
    const firstLine = memory.note.split('\n')[0].trim()
    if (firstLine.length > 50) {
      return firstLine.substring(0, 47) + '...'
    }
    return firstLine || 'Untitled Memory'
  }

  // Get preview text
  const getPreviewText = () => {
    if (memory.title) {  // Use title instead of title_override
      // If there's a custom title, show the note as preview
      const text = memory.note.replace(/\n/g, ' ').trim()
      return text.length > 120 ? text.substring(0, 117) + '...' : text
    } else {
      // If no custom title, show remaining text after first line
      const lines = memory.note.split('\n')
      if (lines.length > 1) {
        const remainingText = lines.slice(1).join(' ').trim()
        return remainingText.length > 120 ? remainingText.substring(0, 117) + '...' : remainingText
      }
      return ''
    }
  }

  return (
    <div 
      className={`${getCardStyling()} rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-xl transition-all duration-200 cursor-pointer`}
      onClick={(e) => {
        // Prevent click when clicking on buttons
        if ((e.target as HTMLElement).tagName === 'BUTTON' || 
            (e.target as HTMLElement).closest('button')) {
          return
        }
        onMemoryClick(memory.id)
      }}
    >
      {/* Header with actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          {getMemoryTypeIcon()}
          {memory.is_highlight && (
            <Star className="w-4 h-4 text-amber-500 fill-current" />
          )}
          <div className={`px-2 py-0.5 text-xs rounded-full ${getImportanceColor()}`}>
            {getImportanceLevel()}
          </div>
          {getEmotionIndicator()}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleHighlight(memory)
            }}
            className={`p-1.5 rounded-md transition-colors ${
              memory.is_highlight
                ? 'text-amber-500 hover:bg-amber-50'
                : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
            }`}
            title="Toggle highlight"
          >
            <Heart className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditMemory(memory)
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-md"
            title="Edit memory"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteMemory(memory.id)
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md"
            title="Delete memory"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title and content */}
      <div className="mb-3">
        <div className="flex items-start gap-2 mb-2">
          <h3 className="font-medium text-sm md:text-base flex-1 text-gray-900">
            {getDisplayTitle()}
          </h3>
          {getPreviewText() && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleDescription(memory.id)
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              title={expandedDescriptions.has(memory.id) ? "Hide details" : "Show details"}
            >
              {expandedDescriptions.has(memory.id) ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <Info className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
        
        {/* Preview text */}
        {getPreviewText() && expandedDescriptions.has(memory.id) && (
          <p className="text-xs text-gray-600 mb-2 leading-relaxed">
            {getPreviewText()}
          </p>
        )}
      </div>

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {memory.tags.slice(0, displayMode === 'grid' ? 3 : 5).map((tag, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                onTagClick?.(tag)
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </button>
          ))}
          {memory.tags.length > (displayMode === 'grid' ? 3 : 5) && (
            <span className="px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded-full">
              +{memory.tags.length - (displayMode === 'grid' ? 3 : 5)}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={`text-xs text-gray-500 ${displayMode === 'grid' ? 'space-y-1' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(memory.created_at)}</span>
          </div>
          {memory.place_name && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{memory.place_name}</span>
            </div>
          )}
        </div>
        
        {memory.category && (
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: memory.category.color }}
            />
            <span>{memory.category.name}</span>
          </div>
        )}
      </div>

      {/* Emotion indicator bar - using emotion_valence since mood doesn't exist in DB */}
      {memory.emotion_valence !== null && memory.emotion_valence !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Emotion:</span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 transition-all duration-300"
                style={{ width: `${((memory.emotion_valence + 5) / 10) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 font-medium">{memory.emotion_valence > 0 ? '+' : ''}{memory.emotion_valence}</span>
          </div>
        </div>
      )}
    </div>
  )
}