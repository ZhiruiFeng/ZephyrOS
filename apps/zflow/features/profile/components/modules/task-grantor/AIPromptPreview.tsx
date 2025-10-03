import React from 'react'
import { Copy, Loader2, RotateCcw, Edit2, Check, X } from 'lucide-react'
import { generateBasicPrompt, improvePrompt } from '@/shared/intelligence'
import { aiTasksApi, type AITask } from '@/lib/api'

interface Props {
  task: AITask
  onTaskUpdate?: () => void
}

export default function AIPromptPreview({ task, onTaskUpdate }: Props) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedPrompt, setEditedPrompt] = React.useState('')
  const [isImprovingPrompt, setIsImprovingPrompt] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleImprovePrompt = async () => {
    setIsImprovingPrompt(true)
    try {
      const result = await improvePrompt(task)
      const improvedPromptText = result.improvedPrompt

      // Update the task with the improved prompt
      await aiTasksApi.update(task.id, { prompt: improvedPromptText })
      onTaskUpdate?.()
    } catch (error) {
      console.error('Failed to improve prompt:', error)
    } finally {
      setIsImprovingPrompt(false)
    }
  }

  const handleStartEdit = () => {
    setEditedPrompt(task.prompt || generateBasicPrompt(task))
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    setIsSaving(true)
    try {
      await aiTasksApi.update(task.id, { prompt: editedPrompt || null })
      setIsEditing(false)
      onTaskUpdate?.()
    } catch (error) {
      console.error('Failed to save prompt:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedPrompt('')
  }

  // Use stored prompt if available, otherwise generate basic prompt
  const currentPrompt = task.prompt || generateBasicPrompt(task)
  const displayPrompt = isEditing ? editedPrompt : currentPrompt

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-800">AI Prompt</span>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                className={`text-xs px-3 py-1.5 border rounded-md inline-flex items-center gap-1.5 transition-colors ${
                  isSaving
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-600 cursor-not-allowed'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin"/>Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3"/>Save
                  </>
                )}
              </button>
              <button
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <X className="w-3 h-3"/>Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className={`text-xs px-3 py-1.5 border rounded-md inline-flex items-center gap-1.5 transition-colors ${
                  isImprovingPrompt
                    ? 'border-indigo-300 bg-indigo-100 text-indigo-600 cursor-not-allowed'
                    : 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
                onClick={handleImprovePrompt}
                disabled={isImprovingPrompt}
              >
                {isImprovingPrompt ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin"/>Improving...
                  </>
                ) : (
                  <>
                    <span className="text-xs">✨</span>Improve with AI
                  </>
                )}
              </button>
              <button
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors"
                onClick={handleStartEdit}
              >
                <Edit2 className="w-3 h-3"/>Edit
              </button>
              <button
                className="text-xs px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(currentPrompt)
                }}
              >
                <Copy className="w-3 h-3"/>Copy
              </button>
            </>
          )}
        </div>
      </div>
      <div className="bg-slate-50 border rounded-lg p-4 text-sm relative">
        {task.prompt && !isEditing && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              <span className="text-xs mr-1">✨</span>Custom Prompt
            </span>
          </div>
        )}
        {isEditing ? (
          <textarea
            className="w-full h-64 bg-white border border-slate-300 rounded-lg p-3 text-slate-700 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={editedPrompt}
            onChange={(e) => setEditedPrompt(e.target.value)}
            placeholder="Enter custom prompt for the AI agent..."
          />
        ) : (
          <pre className="whitespace-pre-wrap text-slate-700 font-mono text-xs leading-relaxed pr-20">
            {displayPrompt}
          </pre>
        )}
      </div>
    </div>
  )
}