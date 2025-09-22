import React from 'react'
import { Settings2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../ui'

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
  return (
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
          <Button variant="outline" className="rounded-2xl flex-shrink-0 self-start sm:self-center">
            <Settings2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refine</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
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
      </CardContent>
    </Card>
  )
}
