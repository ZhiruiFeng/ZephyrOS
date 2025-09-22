import React, { useState } from 'react'
import { Brain, RefreshCw, CalendarClock, Rocket } from 'lucide-react'
import { Button } from '../ui'
import { CreateInitiativeModal } from '../modals'

interface PageHeaderProps {
  onRefresh: () => void
  onInitiativeCreated?: (initiative: any) => void
  seasonId?: string
}

export const PageHeader = ({ onRefresh, onInitiativeCreated, seasonId }: PageHeaderProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleInitiativeCreated = (initiative: any) => {
    onInitiativeCreated?.(initiative)
    setShowCreateModal(false)
  }

  return (
    <>
      <div className="bg-gradient-to-r from-white to-gray-50/50 border-b border-gray-200/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Strategy Cockpit</h1>
                <p className="text-xs sm:text-sm text-gray-600">Strategic planning and execution dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              <Button
                variant="secondary"
                onClick={onRefresh}
                className="flex-shrink-0 min-w-0 px-3 sm:px-4"
                title="Refresh Dashboard"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="secondary"
                className="flex-shrink-0 min-w-0 px-3 sm:px-4"
                title="Weekly Review"
              >
                <CalendarClock className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Weekly Review</span>
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white flex-shrink-0 min-w-0 px-3 sm:px-4"
                title="Create New Initiative"
              >
                <Rocket className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Initiative</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CreateInitiativeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleInitiativeCreated}
        seasonId={seasonId}
      />
    </>
  )
}
