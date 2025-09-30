import React from 'react'
import { Settings2, Maximize2, Calendar, ExternalLink, ChevronRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../ui'
import { FullscreenModal, useFullscreenModal } from '../modals/FullscreenModal'
import { useEpisodes } from '@/narrative'
import { SEASON_THEMES } from '@/types/domain/narrative'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

  // Fetch latest episode for this season
  const { episodes, loading: episodesLoading } = useEpisodes(season?.id, { limit: 1 })
  const latestEpisode = episodes?.[0]

  // Get season theme configuration
  const seasonTheme = season?.theme ? SEASON_THEMES[season.theme as keyof typeof SEASON_THEMES] : null

  // Calculate season stats
  // Try to get start date from season.start_date, season.created_at, or first episode
  const seasonStartDate = season?.start_date && season.start_date !== ''
    ? new Date(season.start_date)
    : season?.created_at && season.created_at !== ''
    ? new Date(season.created_at)
    : latestEpisode?.date_range_start
    ? new Date(latestEpisode.date_range_start)
    : null

  const today = new Date()
  const daysInSeason = seasonStartDate
    ? Math.floor((today.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 // +1 to include today
    : 0

  const handleNavigateToNarrative = () => {
    router.push('/narrative')
  }

  const renderContent = () => (
    <>
      {/* Progress Bar */}
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

      {/* Latest Episode Section */}
      {latestEpisode && !episodesLoading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Latest Episode
            </h4>
            <button
              onClick={handleNavigateToNarrative}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              View All
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div
            onClick={handleNavigateToNarrative}
            className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-2">
              {latestEpisode.mood_emoji && (
                <span className="text-2xl">{latestEpisode.mood_emoji}</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h5 className="font-medium text-gray-900 text-sm truncate">
                    {latestEpisode.title}
                  </h5>
                  <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  {new Date(latestEpisode.date_range_start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })} - {new Date(latestEpisode.date_range_end).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                {latestEpisode.reflection && (
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {latestEpisode.reflection}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Season Stats */}
      {daysInSeason > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            {daysInSeason} days in season
          </div>
        </div>
      )}

      {season?.keyMetrics && season.keyMetrics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {season.keyMetrics.map((metric: string, i: number) => (
            <Badge key={i} variant="secondary">{metric}</Badge>
          ))}
        </div>
      )}
    </>
  )

  // Determine card gradient based on season theme
  const cardGradient = seasonTheme
    ? `bg-gradient-to-br ${seasonTheme.gradient}`
    : 'bg-gradient-to-br from-white to-gray-50'

  return (
    <>
      <Card className={`rounded-2xl shadow-lg border-0 hover:shadow-xl transition-shadow duration-300 ${cardGradient}`}>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl truncate flex items-center gap-2">
                {seasonTheme && <span>{seasonTheme.emoji}</span>}
                Current Season — {seasonTheme?.name || season?.theme || 'No Active Season'}
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
