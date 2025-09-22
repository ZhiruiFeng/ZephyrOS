import React from 'react'
import { InitiativeCard } from '../business'

interface VisionLensProps {
  filteredInitiatives: any[]
  progressIntentCallback: (p: number) => string
  hasActiveFilters: boolean
}

export const VisionLens = ({
  filteredInitiatives,
  progressIntentCallback,
  hasActiveFilters
}: VisionLensProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        See top initiatives and their alignment with the season goal.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredInitiatives.map((initiative) => (
          <InitiativeCard
            key={initiative.id}
            initiative={initiative}
            progressIntent={progressIntentCallback}
          />
        ))}
        {filteredInitiatives.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-500">
            {hasActiveFilters
              ? 'No initiatives match your search criteria.'
              : 'No initiatives found. Create some to get started!'
            }
          </div>
        )}
      </div>
    </div>
  )
}
