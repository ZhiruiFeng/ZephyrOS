import React from 'react'
import { Settings2, Maximize2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../ui'
import { FullscreenModal, useFullscreenModal } from '../modals/FullscreenModal'

interface Season {
  id: string
  theme?: string
  title?: string
  metric?: string
  progress?: number
  strategicTheme?: string
  keyMetrics?: string[]
}

interface SeasonGoalCardProps {
  season: any
  progressIntent: (p: number) => string
}

export const SeasonGoalCard = ({ season, progressIntent }: SeasonGoalCardProps) => {
  const fullscreen = useFullscreenModal()

  const renderContent = () => (
    <>
      <div className="mt-2">
        <div className="mb-2 text-sm text-slate-600">
          Progress {season?.progress || 0}%
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-2 ${progressIntent(season?.progress || 0)} rounded-full transition-all`}
            style={{ width: `${season?.progress || 0}%` }}
          />
        </div>
      </div>
      {season?.strategicTheme && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary">{season.strategicTheme}</Badge>
          {season.keyMetrics?.map((metric: string, i: number) => (
            <Badge key={i} variant="secondary">{metric}</Badge>
          ))}
        </div>
      )}
    </>
  )

  return (
    <>
      <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-white to-gray-50 border-0 hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl truncate">
                Current Season — {season?.theme || 'No Active Season'}
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                Anchor goal: <span className="font-medium text-slate-800">
                  {season?.title || 'No season title'}
                </span>
                {season?.metric && <> • Metric: {season.metric}</>}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fullscreen.open}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="View fullscreen"
                aria-label="View fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <Button variant="outline" className="rounded-2xl flex-shrink-0 self-start sm:self-center">
                <Settings2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refine</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {renderContent()}
        </CardContent>
      </Card>

      <FullscreenModal
        isOpen={fullscreen.isOpen}
        onClose={fullscreen.close}
        title={`Current Season — ${season?.theme || 'No Active Season'}`}
        icon={<Settings2 className="w-6 h-6 text-blue-600" />}
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Season Overview</h3>
            <p className="text-gray-600">
              Anchor goal: <span className="font-medium text-gray-800">
                {season?.title || 'No season title'}
              </span>
              {season?.metric && <> • Metric: {season.metric}</>}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            {renderContent()}
          </div>

          {/* Additional detailed view content can be added here */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Season Details</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Theme:</span> {season?.theme || 'No theme set'}</div>
                <div><span className="font-medium">Progress:</span> {season?.progress || 0}%</div>
                {season?.metric && <div><span className="font-medium">Key Metric:</span> {season.metric}</div>}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Strategic Focus</h4>
              <div className="space-y-2">
                {season?.strategicTheme ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{season.strategicTheme}</Badge>
                    {season.keyMetrics?.map((metric: string, i: number) => (
                      <Badge key={i} variant="secondary">{metric}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No strategic themes defined</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </FullscreenModal>
    </>
  )
}
