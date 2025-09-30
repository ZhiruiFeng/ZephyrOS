import React from 'react'
import { Target, Plus } from 'lucide-react'
import { InitiativeCard } from '../business'
import { Button } from '../ui'

interface VisionLensProps {
  filteredInitiatives: any[]
  progressIntentCallback: (p: number) => string
  hasActiveFilters: boolean
  onInitiativeUpdated?: (initiative: any) => void
}

export const VisionLens = ({
  filteredInitiatives,
  progressIntentCallback,
  hasActiveFilters,
  onInitiativeUpdated
}: VisionLensProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        See top initiatives and their alignment with the season goal.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredInitiatives.map((initiative) => (
          <InitiativeCard
            key={initiative.id}
            initiative={initiative}
            progressIntent={progressIntentCallback}
            onInitiativeUpdated={onInitiativeUpdated}
          />
        ))}
        {filteredInitiatives.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {hasActiveFilters ? 'No matching initiatives' : 'No initiatives yet'}
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center max-w-md">
              {hasActiveFilters
                ? 'Try adjusting your filters to see more initiatives.'
                : 'Start by creating your first strategic initiative. These are the big-picture goals that drive your season forward.'
              }
            </p>
            {!hasActiveFilters && (
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Initiative
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
