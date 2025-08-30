import { NextRequest } from 'next/server'
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth'
import { supabase as serviceClient } from '../../../../lib/supabase'
import { createOptionsResponse, jsonWithCors } from '../../../../lib/security'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        // Dev fallback with mock stats
        return jsonWithCors(request, {
          total_activities: 42,
          this_week: 8,
          avg_satisfaction: 8.2,
          avg_mood_improvement: 1.8,
          top_activity_type: 'exercise',
          total_time_minutes: 1260,
          by_type: {
            exercise: { count: 15, avg_satisfaction: 9.1, total_minutes: 450 },
            reading: { count: 12, avg_satisfaction: 8.5, total_minutes: 360 },
            meditation: { count: 8, avg_satisfaction: 8.8, total_minutes: 240 },
            socializing: { count: 7, avg_satisfaction: 7.9, total_minutes: 210 }
          }
        })
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }

    const client = createClientForRequest(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Get basic activity statistics
    const { data: basicStats } = await client
      .from('activities')
      .select('id, activity_type, satisfaction_level, mood_before, mood_after, duration_minutes, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', since)

    if (!basicStats) {
      return jsonWithCors(request, { error: 'Failed to fetch statistics' }, 500)
    }

    // Calculate statistics
    const completedActivities = basicStats.filter(a => a.status === 'completed')
    const totalActivities = basicStats.length
    const avgSatisfaction = completedActivities.length > 0 
      ? completedActivities
          .filter(a => a.satisfaction_level !== null)
          .reduce((sum, a) => sum + (a.satisfaction_level || 0), 0) / completedActivities.filter(a => a.satisfaction_level !== null).length
      : 0

    const moodImprovements = completedActivities
      .filter(a => a.mood_before !== null && a.mood_after !== null)
      .map(a => (a.mood_after || 0) - (a.mood_before || 0))
    
    const avgMoodImprovement = moodImprovements.length > 0 
      ? moodImprovements.reduce((sum, diff) => sum + diff, 0) / moodImprovements.length 
      : 0

    const totalTimeMinutes = completedActivities
      .filter(a => a.duration_minutes !== null)
      .reduce((sum, a) => sum + (a.duration_minutes || 0), 0)

    // Group by activity type
    const byType: Record<string, any> = {}
    completedActivities.forEach(activity => {
      const type = activity.activity_type || 'other'
      if (!byType[type]) {
        byType[type] = {
          count: 0,
          satisfactions: [],
          total_minutes: 0
        }
      }
      byType[type].count++
      if (activity.satisfaction_level !== null) {
        byType[type].satisfactions.push(activity.satisfaction_level)
      }
      if (activity.duration_minutes !== null) {
        byType[type].total_minutes += activity.duration_minutes
      }
    })

    // Calculate averages for each type
    Object.keys(byType).forEach(type => {
      const typeData = byType[type]
      typeData.avg_satisfaction = typeData.satisfactions.length > 0 
        ? typeData.satisfactions.reduce((sum: number, s: number) => sum + s, 0) / typeData.satisfactions.length
        : 0
      delete typeData.satisfactions // Clean up intermediate data
    })

    const topActivityType = Object.keys(byType).reduce((top, type) => 
      byType[type].count > (byType[top]?.count || 0) ? type : top, 
    Object.keys(byType)[0] || 'none')

    // Get this week's count
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    
    const thisWeekCount = basicStats.filter(a => 
      new Date(a.created_at || '') >= weekStart
    ).length

    const stats = {
      total_activities: totalActivities,
      completed_activities: completedActivities.length,
      this_week: thisWeekCount,
      avg_satisfaction: Math.round(avgSatisfaction * 10) / 10,
      avg_mood_improvement: Math.round(avgMoodImprovement * 10) / 10,
      top_activity_type: topActivityType,
      total_time_minutes: totalTimeMinutes,
      by_type: byType,
      period_days: days
    }

    return jsonWithCors(request, stats)
  } catch (error) {
    console.error('GET activities stats error:', error)
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}
