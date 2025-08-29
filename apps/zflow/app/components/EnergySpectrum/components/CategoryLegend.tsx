import React from 'react'
import { formatDuration } from '../../../utils/timeUtils'
import type { CategorySummary } from '../types'

interface CategoryLegendProps {
  categorySummary: CategorySummary[]
  isMobile?: boolean
}

export function CategoryLegend({ categorySummary, isMobile = false }: CategoryLegendProps) {
  if (!categorySummary.length) return null

  if (isMobile) {
    return (
      <div className="bg-gray-50 rounded-lg p-2">
        <div className="text-xs text-gray-600 font-medium mb-2">Categories</div>
        <div className="flex flex-wrap gap-1.5">
          {categorySummary.map((category) => (
            <div key={category.id} className="flex items-center gap-1 bg-white rounded-full px-2 py-1 border border-gray-200">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: category.color }}
              />
              <span className="text-xs text-gray-700 font-medium">{category.name}</span>
              <span className="text-xs text-gray-500">({formatDuration(category.minutes)})</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-600 font-medium mb-2">Time Entry Categories</div>
      <div className="flex flex-wrap gap-2">
        {categorySummary.map((category) => (
          <div key={category.id} className="flex items-center gap-1.5 bg-white rounded-full px-2 py-1 border border-gray-200">
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0" 
              style={{ backgroundColor: category.color }}
            />
            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">{category.name}</span>
            <span className="text-xs text-gray-500">({formatDuration(category.minutes)})</span>
          </div>
        ))}
      </div>
    </div>
  )
}
