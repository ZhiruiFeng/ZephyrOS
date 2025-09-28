import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '@/auth'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'
import type { SeasonRecapResponse, SeasonStatistics } from '../../../../../../types/narrative'

// Server-side Supabase client using service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Function to calculate statistics from episodes
function calculateStatistics(season: any, episodes: any[]): SeasonStatistics {
  const moodCounts: Record<string, number> = {}
  let totalReflectionWords = 0

  // Calculate mood distribution and word counts
  episodes.forEach(episode => {
    if (episode.mood_emoji) {
      moodCounts[episode.mood_emoji] = (moodCounts[episode.mood_emoji] || 0) + 1
    }

    if (episode.reflection) {
      totalReflectionWords += episode.reflection.split(/\s+/).filter((word: string) => word.length > 0).length
    }
  })

  // Get most common moods
  const mostCommonMoods = Object.entries(moodCounts)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Calculate date range
  const startDate = season.start_date || (episodes.length > 0 ? episodes[episodes.length - 1].date_range_start : new Date().toISOString().split('T')[0])
  const endDate = season.end_date || (episodes.length > 0 ? episodes[0].date_range_end : new Date().toISOString().split('T')[0])

  const start = new Date(startDate)
  const end = new Date(endDate)
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  return {
    total_episodes: episodes.length,
    date_range: {
      start: startDate,
      end: endDate,
      duration_days: Math.max(1, durationDays)
    },
    mood_distribution: moodCounts,
    most_common_moods: mostCommonMoods,
    reflection_word_count: totalReflectionWords,
    themes: [] // Could be extracted from reflection text analysis
  }
}

// Function to extract highlights from episodes
function extractHighlights(episodes: any[]): string[] {
  const highlights: string[] = []

  // Get episodes with reflections
  const episodesWithReflections = episodes.filter(ep => ep.reflection && ep.reflection.trim().length > 0)

  // Sort by reflection length to get more substantial entries
  episodesWithReflections
    .sort((a, b) => (b.reflection?.length || 0) - (a.reflection?.length || 0))
    .slice(0, 5) // Top 5 most detailed episodes
    .forEach(episode => {
      const reflection = episode.reflection.trim()
      // Take first sentence or up to 150 characters
      const firstSentence = reflection.split(/[.!?]/)[0]
      const highlight = firstSentence.length > 150 ?
        reflection.substring(0, 150) + '...' :
        firstSentence + '.'

      highlights.push(`${episode.title}: ${highlight}`)
    })

  return highlights
}

// =====================================================
// OPTIONS handler for CORS
// =====================================================
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}

// =====================================================
// POST /api/narrative/seasons/[id]/recap
// Generate a recap for a season
// =====================================================
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    if (!supabase) {
      return jsonWithCors(request, { message: 'Database connection not available' }, 503)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { message: 'Authentication required' }, 401)
    }

    // Get season
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (seasonError || !season) {
      return jsonWithCors(request, { message: 'Season not found' }, 404)
    }

    // Get all episodes for this season
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('*')
      .eq('season_id', params.id)
      .eq('user_id', userId)
      .order('date_range_start', { ascending: false })

    if (episodesError) {
      console.error('Error fetching episodes for recap:', episodesError)
      return jsonWithCors(request, { message: 'Failed to fetch season episodes' }, 500)
    }

    const episodeList = episodes || []

    // Calculate statistics
    const statistics = calculateStatistics(season, episodeList)

    // Extract highlights
    const highlights = extractHighlights(episodeList)

    // TODO: Generate AI summary using existing AI integration
    // For now, create a basic summary
    let generatedSummary = ''
    if (episodeList.length > 0) {
      const { theme, title } = season
      const { total_episodes, date_range, most_common_moods } = statistics

      const topMood = most_common_moods[0]
      const moodText = topMood ? ` Your most common mood was ${topMood.emoji} (${topMood.count} times).` : ''

      generatedSummary = `Your ${theme} season "${title}" lasted ${date_range.duration_days} days with ${total_episodes} episodes.${moodText} This season has been a journey of growth and reflection.`
    }

    const recap: SeasonRecapResponse = {
      season,
      episodes: episodeList,
      statistics,
      highlights,
      generated_summary: generatedSummary
    }

    return jsonWithCors(request, recap)
  } catch (error) {
    console.error('Season recap error:', error)
    return jsonWithCors(request, { message: 'Authentication failed' }, 401)
  }
}