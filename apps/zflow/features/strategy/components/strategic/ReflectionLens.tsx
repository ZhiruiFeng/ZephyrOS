import React from 'react'
import { Lightbulb } from 'lucide-react'
import { Button, Textarea, Badge } from '../ui'

interface ReflectionLensProps {
  reflectionContent: string
  onReflectionContentChange: (content: string) => void
  onSaveReflection: () => void
  recentMemories: any
}

export const ReflectionLens = ({
  reflectionContent,
  onReflectionContentChange,
  onSaveReflection,
  recentMemories
}: ReflectionLensProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Capture insights to fuel strategy updates.
      </p>
      <Textarea
        placeholder="What did I learn this week? What should I change next?"
        value={reflectionContent}
        onChange={(e) => onReflectionContentChange(e.target.value)}
        className="min-h-[100px]"
      />
      <div className="flex gap-2">
        <Button variant="secondary">
          <Lightbulb className="h-4 w-4 mr-2" />
          Prompt Me
        </Button>
        <Button onClick={onSaveReflection} disabled={!reflectionContent.trim()}>
          Save Reflection
        </Button>
      </div>

      {/* Recent Reflections */}
      {recentMemories && recentMemories.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Recent Strategic Memories</h4>
          <div className="space-y-2">
            {recentMemories.slice(0, 3).map((memory: any) => (
              <div key={memory.id} className="border rounded-lg p-3 text-sm">
                <div className="font-medium">{memory.title || 'Untitled'}</div>
                <div className="text-gray-600 mt-1">
                  {memory.note.slice(0, 120)}
                  {memory.note.length > 120 && '...'}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {memory.strategyType}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(memory.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
