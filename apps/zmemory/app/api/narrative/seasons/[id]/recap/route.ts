import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { getClientForAuthType } from '@/auth';
import type { SeasonRecapResponse, SeasonStatistics } from '../../../../../../types/narrative';

export const dynamic = 'force-dynamic';

// Function to calculate statistics from episodes
function calculateStatistics(season: any, episodes: any[]): SeasonStatistics {
  const moodCounts: Record<string, number> = {};
  let totalReflectionWords = 0;

  // Calculate mood distribution and word counts
  episodes.forEach(episode => {
    if (episode.mood_emoji) {
      moodCounts[episode.mood_emoji] = (moodCounts[episode.mood_emoji] || 0) + 1;
    }

    if (episode.reflection) {
      totalReflectionWords += episode.reflection.split(/\s+/).filter((word: string) => word.length > 0).length;
    }
  });

  // Get most common moods
  const mostCommonMoods = Object.entries(moodCounts)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate date range
  const startDate = season.start_date || (episodes.length > 0 ? episodes[episodes.length - 1].date_range_start : new Date().toISOString().split('T')[0]);
  const endDate = season.end_date || (episodes.length > 0 ? episodes[0].date_range_end : new Date().toISOString().split('T')[0]);

  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

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
  };
}

// Function to extract highlights from episodes
function extractHighlights(episodes: any[]): string[] {
  const highlights: string[] = [];

  // Get episodes with reflections
  const episodesWithReflections = episodes.filter(ep => ep.reflection && ep.reflection.trim().length > 0);

  // Sort by reflection length to get more substantial entries
  episodesWithReflections
    .sort((a, b) => (b.reflection?.length || 0) - (a.reflection?.length || 0))
    .slice(0, 5) // Top 5 most detailed episodes
    .forEach(episode => {
      const reflection = episode.reflection.trim();
      // Take first sentence or up to 150 characters
      const firstSentence = reflection.split(/[.!?]/)[0];
      const highlight = firstSentence.length > 150 ?
        reflection.substring(0, 150) + '...' :
        firstSentence + '.';

      highlights.push(`${episode.title}: ${highlight}`);
    });

  return highlights;
}

/**
 * POST /api/narrative/seasons/[id]/recap - Generate a recap for a season
 */
async function handleGenerateSeasonRecap(
  request: EnhancedRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;
  const userId = request.userId!;
  const client = await getClientForAuthType(request) || serviceClient;

  if (!client) {
    return NextResponse.json({ message: 'Database connection not available' }, { status: 503 });
  }

  // Get season
  const { data: season, error: seasonError } = await client
    .from('seasons')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (seasonError || !season) {
    return NextResponse.json({ message: 'Season not found' }, { status: 404 });
  }

  // Get all episodes for this season
  const { data: episodes, error: episodesError } = await client
    .from('episodes')
    .select('*')
    .eq('season_id', id)
    .eq('user_id', userId)
    .order('date_range_start', { ascending: false });

  if (episodesError) {
    return NextResponse.json({ message: 'Failed to fetch season episodes' }, { status: 500 });
  }

  const episodeList = episodes || [];

  // Calculate statistics
  const statistics = calculateStatistics(season, episodeList);

  // Extract highlights
  const highlights = extractHighlights(episodeList);

  // TODO: Generate AI summary using existing AI integration
  // For now, create a basic summary
  let generatedSummary = '';
  if (episodeList.length > 0) {
    const { theme, title } = season;
    const { total_episodes, date_range, most_common_moods } = statistics;

    const topMood = most_common_moods[0];
    const moodText = topMood ? ` Your most common mood was ${topMood.emoji} (${topMood.count} times).` : '';

    generatedSummary = `Your ${theme} season "${title}" lasted ${date_range.duration_days} days with ${total_episodes} episodes.${moodText} This season has been a journey of growth and reflection.`;
  }

  const recap: SeasonRecapResponse = {
    season,
    episodes: episodeList,
    statistics,
    highlights,
    generated_summary: generatedSummary
  };

  return NextResponse.json(recap);
}

// Apply middleware
export const POST = withStandardMiddleware(handleGenerateSeasonRecap, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  }
});

// Explicit OPTIONS handler for CORS preflight
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false
});
