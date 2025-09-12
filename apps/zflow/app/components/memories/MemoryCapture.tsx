'use client'

import React from 'react'
import { 
  X, 
  Save, 
  Mic, 
  MicOff, 
  MapPin, 
  Tag, 
  Smile, 
  Heart,
  Sparkles,
  MessageSquare,
  Link,
  FileText,
  Brain,
  Quote,
  Lightbulb
} from 'lucide-react'
import { Memory, MemoryCreateInput } from '../../types/memory'
import { memoriesApi, useMemoryOperations } from '../../../lib/memories-api'
import { useSTTConfig } from '../../../contexts/STTConfigContext'

interface MemoryCaptureProps {
  isOpen: boolean
  onClose: () => void
  onMemoryCreated: (memory: Memory) => void
  onMemoryUpdated?: (memory: Memory) => void
  categories?: any[]
  initialContent?: string
  editingMemory?: Memory
}

export default function MemoryCapture({
  isOpen,
  onClose,
  onMemoryCreated,
  onMemoryUpdated,
  categories = [],
  initialContent = '',
  editingMemory
}: MemoryCaptureProps) {
  const { config: sttConfig } = useSTTConfig()
  const [content, setContent] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [memoryType, setMemoryType] = React.useState<'note' | 'link' | 'file' | 'thought' | 'quote' | 'insight'>('note')
  const [tags, setTags] = React.useState<string[]>([])
  const [newTag, setNewTag] = React.useState('')
  const [categoryId, setCategoryId] = React.useState<string>('')
  const [placeName, setPlaceName] = React.useState('')
  const [importance, setImportance] = React.useState<'low' | 'medium' | 'high'>('medium')
  const [mood, setMood] = React.useState<number>(5)
  const [isHighlight, setIsHighlight] = React.useState(false)
  const [isRecording, setIsRecording] = React.useState(false)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isTranscribing, setIsTranscribing] = React.useState(false)
  
  const { createMemory } = useMemoryOperations()
  
  // Audio recording state
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = React.useState<Blob[]>([])

  // Initialize form when editing
  React.useEffect(() => {
    if (editingMemory) {
      setContent(editingMemory.note)
      setTitle(editingMemory.title || '')  // Use title instead of title_override
      setMemoryType(editingMemory.memory_type)
      setTags(editingMemory.tags)
      setCategoryId(editingMemory.category_id || '')
      setPlaceName(editingMemory.place_name || '')
      // Note: importance_level and mood don't exist in DB schema, use defaults
      setImportance('medium')
      setMood(5)
      setIsHighlight(editingMemory.is_highlight)
    } else if (initialContent) {
      setContent(initialContent)
    }
  }, [editingMemory, initialContent])

  // Reset form when closed
  React.useEffect(() => {
    if (!isOpen) {
      setContent('')
      setTitle('')
      setMemoryType('note')
      setTags([])
      setNewTag('')
      setCategoryId('')
      setPlaceName('')
      setImportance('medium')
      setMood(5)
      setIsHighlight(false)
      setIsRecording(false)
      setIsAnalyzing(false)
    }
  }, [isOpen])

  const getMemoryTypeIcon = (type: string) => {
    const iconClass = "w-4 h-4"
    switch (type) {
      case 'note': return <MessageSquare className={iconClass} />
      case 'link': return <Link className={iconClass} />
      case 'file': return <FileText className={iconClass} />
      case 'thought': return <Brain className={iconClass} />
      case 'quote': return <Quote className={iconClass} />
      case 'insight': return <Lightbulb className={iconClass} />
      default: return <MessageSquare className={iconClass} />
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave()
    }
  }

  const handleAutoEnhance = async () => {
    if (!content.trim()) return
    
    setIsAnalyzing(true)
    try {
      const analysis = await memoriesApi.analyze(content)
      
      // Apply suggestions
      if (analysis.importance_level) {
        setImportance(analysis.importance_level)
      }
      if (analysis.mood) {
        setMood(analysis.mood)
      }
      if (analysis.suggested_tags) {
        // Add unique tags
        const uniqueTags = Array.from(new Set([...tags, ...analysis.suggested_tags]))
        setTags(uniqueTags)
      }
    } catch (error) {
      console.error('Auto-enhance failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) return

    setIsSaving(true)
    try {
      const memoryData: MemoryCreateInput = {
        // Title required
        title: title.trim(),
        // Content optional
        note: content.trim() ? content.trim() : undefined,
        memory_type: memoryType,
        tags,
        category_id: categoryId || undefined,
        place_name: placeName.trim() || undefined,
        importance_level: importance,  // This will be filtered out by API
        mood,  // This will be filtered out by API
        is_highlight: isHighlight,
        source: 'manual'  // This will be filtered out by API
      }

      let memory: Memory
      if (editingMemory) {
        memory = await memoriesApi.update(editingMemory.id, memoryData)
        onMemoryUpdated?.(memory)
      } else {
        memory = await createMemory(title.trim(), memoryData)
        onMemoryCreated(memory)
      }
      onClose()
    } catch (error) {
      console.error('Failed to save memory:', error)
      // TODO: Show error toast
    } finally {
      setIsSaving(false)
    }
  }

  const handleVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
      setIsRecording(false)
      return
    }

    try {
      // Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        setAudioChunks(chunks)
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop())
        
        // Transcribe audio
        await transcribeAudio(audioBlob)
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      alert('Failed to access microphone. Please check permissions.')
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.wav')
      
      // Add language and model for OpenAI, or model_id for ElevenLabs
      if (sttConfig.provider === 'elevenlabs') {
        formData.append("model_id", "scribe_v1");
      } else {
        formData.append("language", "auto");
        formData.append("model", "whisper-1");
      }

      const { getAuthHeader } = await import('../../../lib/supabase')
      const authHeaders = await getAuthHeader()
      
      // Use the appropriate API endpoint based on STT configuration
      const apiEndpoint = sttConfig.provider === 'elevenlabs' ? "/api/elevenlabs-transcribe" : "/api/transcribe";
      const response = await fetch(apiEndpoint, { 
        method: "POST", 
        headers: authHeaders, 
        body: formData 
      });
      
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(`${data?.error || "transcribe_failed"}${data?.detail ? `: ${data.detail}` : ""}`);
      }
      
      // Append transcribed text to content
      const transcribedText = data.text || '';
      if (transcribedText) {
        setContent(prev => prev + (prev ? ' ' : '') + transcribedText)
      }
    } catch (error) {
      console.error('Transcription failed:', error)
      alert(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl md:rounded-xl shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingMemory ? 'Edit Memory' : 'New Memory'}
          </h2>
          <div className="flex items-center gap-2">
            {content.trim() && (
              <button
                onClick={handleAutoEnhance}
                disabled={isAnalyzing}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {isAnalyzing ? 'Analyzing...' : 'Enhance'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-auto max-h-[70vh]">
          {/* Memory Type Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {['note', 'thought', 'quote', 'insight', 'link', 'file'].map((type) => (
                <button
                  key={type}
                  onClick={() => setMemoryType(type as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    memoryType === type
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getMemoryTypeIcon(type)}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Title (required) */}
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your memory a title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Content (optional) */}
          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content
            </label>
            <div className="relative">
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="What's on your mind?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={4}
              />
              <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
                {isTranscribing && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Transcribing...
                  </div>
                )}
                {sttConfig.showProviderInUI && (isRecording || isTranscribing) && (
                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                    {sttConfig.provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'}
                  </div>
                )}
                <button
                  onClick={handleVoiceRecord}
                  disabled={isTranscribing}
                  className={`p-2 rounded-lg transition-colors ${
                    isRecording
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : isTranscribing
                      ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={
                    isTranscribing 
                      ? 'Transcribing...' 
                      : isRecording 
                        ? 'Stop recording' 
                        : 'Voice input'
                  }
                >
                  {isTranscribing ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Category */}
            {categories.length > 0 && (
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Place */}
            <div>
              <label htmlFor="place" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Place
              </label>
              <input
                id="place"
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="Where are you?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Importance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Importance
              </label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setImportance(level)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      importance === level
                        ? level === 'high' ? 'bg-red-100 text-red-700' :
                          level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Smile className="w-4 h-4 inline mr-1" />
                Mood: {mood}/10
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={mood}
                onChange={(e) => setMood(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>😢</span>
                <span>😐</span>
                <span>😊</span>
              </div>
            </div>
          </div>

          {/* Highlight Toggle */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setIsHighlight(!isHighlight)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isHighlight
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart className={`w-4 h-4 ${isHighlight ? 'fill-current' : ''}`} />
              Mark as highlight
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 md:p-6 bg-white">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {title.length} title chars • Cmd+Enter to save
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : editingMemory ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
