import React from 'react'
import { Copy, Loader2, RotateCcw } from 'lucide-react'
import { generateBasicPrompt, improvePrompt } from '@/shared/intelligence'
import type { AITask } from '@/lib/api'

interface Props {
  task: AITask
}

export default function AIPromptPreview({ task }: Props) {
  const [improvedPrompt, setImprovedPrompt] = React.useState<string | null>(null)
  const [isImprovingPrompt, setIsImprovingPrompt] = React.useState(false)

  // Reset improved prompt when task changes
  React.useEffect(() => {
    setImprovedPrompt(null)
    setIsImprovingPrompt(false)
  }, [task.id])

  const handleImprovePrompt = async () => {
    setIsImprovingPrompt(true)
    try {
      const result = await improvePrompt(task)
      setImprovedPrompt(result.improvedPrompt)
    } catch (error) {
      console.error('Failed to improve prompt:', error)
      setImprovedPrompt(generateBasicPrompt(task))
    } finally {
      setIsImprovingPrompt(false)
    }
  }

  const currentPrompt = improvedPrompt || generateBasicPrompt(task)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-800">AI Prompt</span>
        <div className="flex gap-2">
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
            onClick={() => {
              navigator.clipboard.writeText(currentPrompt)
            }}
          >
            <Copy className="w-3 h-3"/>Copy Prompt
          </button>
          {improvedPrompt && (
            <button
              className="text-xs px-3 py-1.5 border border-orange-300 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 inline-flex items-center gap-1.5 transition-colors"
              onClick={() => {
                setImprovedPrompt(null)
              }}
            >
              <RotateCcw className="w-3 h-3"/>Reset
            </button>
          )}
        </div>
      </div>
      <div className="bg-slate-50 border rounded-lg p-4 text-sm relative">
        {improvedPrompt && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              <span className="text-xs mr-1">✨</span>AI Enhanced
            </span>
          </div>
        )}
        <pre className="whitespace-pre-wrap text-slate-700 font-mono text-xs leading-relaxed pr-20">
          {currentPrompt}
        </pre>
      </div>
    </div>
  )
}