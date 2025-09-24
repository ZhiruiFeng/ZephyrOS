'use client'

import React, { useState } from 'react'
import { Plus, Lightbulb, Award, Eye, BookOpen, Heart } from 'lucide-react'
import { Button } from '../ui'

export type ReflectionType = 'learning' | 'milestone' | 'insight' | 'reflection' | 'gratitude'

interface ReflectionItem {
  id: string
  type: ReflectionType
  title: string
  content: string
}

interface ReflectionTypeSelectorProps {
  onAddReflection: (type: ReflectionType) => void
  onCancel: () => void
}

const REFLECTION_TYPES = [
  {
    type: 'learning' as ReflectionType,
    title: 'Learning',
    description: 'Lessons learned and knowledge gained',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'blue',
    placeholder: 'What did you learn today? Any new insights or skills acquired?'
  },
  {
    type: 'milestone' as ReflectionType,
    title: 'Milestone',
    description: 'Achievements and significant progress',
    icon: <Award className="w-5 h-5" />,
    color: 'green',
    placeholder: 'What milestone did you reach? What progress did you make?'
  },
  {
    type: 'insight' as ReflectionType,
    title: 'Insight',
    description: 'Deep realizations and understanding',
    icon: <Lightbulb className="w-5 h-5" />,
    color: 'yellow',
    placeholder: 'What insight did you gain? Any "aha" moments or deeper understanding?'
  },
  {
    type: 'reflection' as ReflectionType,
    title: 'General Reflection',
    description: 'Thoughts and observations about the day',
    icon: <Eye className="w-5 h-5" />,
    color: 'purple',
    placeholder: 'How do you feel about today? Any thoughts or observations?'
  },
  {
    type: 'gratitude' as ReflectionType,
    title: 'Gratitude',
    description: 'Things you are grateful for today',
    icon: <Heart className="w-5 h-5" />,
    color: 'pink',
    placeholder: 'What are you grateful for today? What brought you joy or appreciation?'
  }
]

export function ReflectionTypeSelector({ onAddReflection, onCancel }: ReflectionTypeSelectorProps) {
  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'border-blue-200 bg-blue-50 hover:border-blue-300 text-blue-700',
      green: 'border-green-200 bg-green-50 hover:border-green-300 text-green-700',
      yellow: 'border-yellow-200 bg-yellow-50 hover:border-yellow-300 text-yellow-700',
      purple: 'border-purple-200 bg-purple-50 hover:border-purple-300 text-purple-700',
      pink: 'border-pink-200 bg-pink-50 hover:border-pink-300 text-pink-700'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  const getIconColorClasses = (color: string) => {
    const colorMap = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      yellow: 'text-yellow-600',
      purple: 'text-purple-600',
      pink: 'text-pink-600'
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Add a Reflection</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>

      <p className="text-sm text-gray-600">
        Choose the type of reflection you&apos;d like to add for today:
      </p>

      {/* Reflection Type Options */}
      <div className="grid gap-3">
        {REFLECTION_TYPES.map((reflectionType) => (
          <div
            key={reflectionType.type}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${getColorClasses(reflectionType.color)}`}
            onClick={() => onAddReflection(reflectionType.type)}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-white ${getIconColorClasses(reflectionType.color)}`}>
                {reflectionType.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {reflectionType.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {reflectionType.description}
                </p>
                <p className="text-xs text-gray-500 italic">
                  {reflectionType.placeholder}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { REFLECTION_TYPES }
