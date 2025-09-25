'use client'

import React from 'react'
import { Edit3, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '../ui'
import { ReflectionType, REFLECTION_TYPES } from './ReflectionTypeSelector'
import type { DailyStrategyItemWithDetails } from '../../../../features/strategy'

interface ReflectionItemDisplayProps {
  reflection: DailyStrategyItemWithDetails
  type: ReflectionType
  onEdit: (reflection: DailyStrategyItemWithDetails, type: ReflectionType) => void
  onDelete: (id: string) => void
}

export function ReflectionItemDisplay({
  reflection,
  type,
  onEdit,
  onDelete
}: ReflectionItemDisplayProps) {
  const getReflectionTypeInfo = (type: ReflectionType) => REFLECTION_TYPES.find(rt => rt.type === type)
  const typeInfo = getReflectionTypeInfo(type)

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this reflection?')) return
    onDelete(reflection.id)
  }

  return (
    <Card key={reflection.id} className={`border-l-4 border-l-${typeInfo?.color}-500`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {typeInfo?.icon}
            <span className="text-base font-medium">{typeInfo?.title}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(reflection, type)}
              className="opacity-60 hover:opacity-100"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="opacity-60 hover:opacity-100 text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">{reflection.title}</h4>
          {reflection.description && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {reflection.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}