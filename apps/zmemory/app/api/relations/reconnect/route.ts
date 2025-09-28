import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import { z } from 'zod';

// Query validation schema
const ReconnectQuerySchema = z.object({
  min_dormant_days: z.string().transform(val => parseInt(val) || 180).optional(), // 6 months default
  tier: z.string().transform(val => parseInt(val)).optional(),
  limit: z.string().transform(val => parseInt(val) || 10).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional(),
  sort_by: z.enum(['last_contact_at', 'tier', 'days_since_last_contact']).optional().default('last_contact_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'), // Oldest first for reconnection
});

// Mock data for development
const generateMockReconnections = () => [
  {
    person_id: '3',
    person: {
      id: '3',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      company: 'Design Studio',
      avatar_url: null,
      job_title: 'Creative Director'
    },
    tier: 50,
    last_contact_at: new Date(Date.now() - 15552000000).toISOString(), // 6 months ago
    dormant_since: new Date(Date.now() - 15552000000).toISOString(),
    days_since_last_contact: 180,
    how_met: 'Design conference 2023',
    relationship_context: 'professional',
    last_interaction_summary: 'Discussed potential collaboration on branding project',
    suggested_opener: "Hey Alice! I was just thinking about our conversation at the design conference. How did that branding project turn out?",
    suggested_channels: ['email', 'social_media'],
    revival_potential_score: 85
  },
  {
    person_id: '4',
    person: {
      id: '4',
      name: 'Michael Chen',
      email: 'michael@tech.co',
      company: 'TechCorp',
      avatar_url: null,
      job_title: 'Software Architect'
    },
    tier: 15,
    last_contact_at: new Date(Date.now() - 23328000000).toISOString(), // 9 months ago
    dormant_since: new Date(Date.now() - 23328000000).toISOString(),
    days_since_last_contact: 270,
    how_met: 'Former colleague',
    relationship_context: 'professional',
    last_interaction_summary: 'Discussed career transition and new role opportunities',
    suggested_opener: "Hi Michael! Hope you're doing well. I've been thinking about our last conversation about career paths. How's everything going at TechCorp?",
    suggested_channels: ['email', 'phone'],
    revival_potential_score: 92
  }
];

/**
 * @swagger
 * /api/relations/reconnect:
 *   get:
 *     summary: Get dormant tie revival suggestions
 *     description: Find relationships that have gone dormant and could benefit from reconnection. Based on Levin et al. research on dormant tie value.
 *     tags: [Relations - Reconnect]
 *     parameters:
 *       - in: query
 *         name: min_dormant_days
 *         schema:
 *           type: integer
 *           default: 180
 *         description: Minimum days since last contact to be considered dormant
 *       - in: query
 *         name: tier
 *         schema:
 *           type: integer
 *           enum: [5, 15, 50, 150]
 *         description: Filter by specific Dunbar tier
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of suggestions (keep manageable for weekly review)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of suggestions to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [last_contact_at, tier, days_since_last_contact]
 *           default: last_contact_at
 *         description: Sort by (last_contact_at shows oldest first)
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort direction (asc = oldest dormant ties first)
 *     responses:
 *       200:
 *         description: Dormant tie revival suggestions with context and conversation starters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       person_id:
 *                         type: string
 *                       person:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           company:
 *                             type: string
 *                           job_title:
 *                             type: string
 *                       tier:
 *                         type: integer
 *                       last_contact_at:
 *                         type: string
 *                       days_since_last_contact:
 *                         type: integer
 *                       how_met:
 *                         type: string
 *                       relationship_context:
 *                         type: string
 *                       last_interaction_summary:
 *                         type: string
 *                       suggested_opener:
 *                         type: string
 *                       suggested_channels:
 *                         type: array
 *                         items:
 *                           type: string
 *                       revival_potential_score:
 *                         type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_dormant:
 *                       type: integer
 *                     by_tier:
 *                       type: object
 *                     average_dormant_days:
 *                       type: number
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rlKey = `${getClientIP(request)}:GET:/api/relations/reconnect`;
    if (isRateLimited(rlKey, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryResult = ReconnectQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return jsonWithCors(request, { error: 'Invalid query parameters', details: queryResult.error.errors }, 400);
    }

    const query = queryResult.data;

    // If Supabase is not configured, return mock data
    if (!supabaseServer) {
      const mockSuggestions = generateMockReconnections();
      const mockSummary = {
        total_dormant: mockSuggestions.length,
        by_tier: {
          5: 0,
          15: 1,
          50: 1,
          150: 0
        },
        average_dormant_days: 225
      };

      return jsonWithCors(request, {
        suggestions: mockSuggestions.slice(query.offset || 0, (query.offset || 0) + (query.limit || 10)),
        summary: mockSummary
      });
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Use the pre-built dormant_tie_suggestions view with additional filtering
    let dbQuery = supabaseServer
      .from('dormant_tie_suggestions')
      .select(`
        person_id,
        name,
        email,
        avatar_url,
        tier,
        last_contact_at,
        dormant_since,
        days_since_last_contact,
        how_met,
        relationship_context,
        last_interaction_summary
      `)
      // The view already filters by is_dormant = true and user_id via RLS

    // Apply additional filters
    if (query.min_dormant_days) {
      dbQuery = dbQuery.gte('days_since_last_contact', query.min_dormant_days);
    }

    if (query.tier) {
      dbQuery = dbQuery.eq('tier', query.tier);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    if (query.sort_by === 'days_since_last_contact') {
      dbQuery = dbQuery.order('days_since_last_contact', { ascending });
    } else {
      dbQuery = dbQuery.order(query.sort_by, { ascending });
    }

    // Apply pagination
    dbQuery = dbQuery.range(query.offset || 0, (query.offset || 0) + (query.limit || 10) - 1);

    const { data: dormantData, error: dormantError } = await dbQuery;

    if (dormantError) {
      console.error('Database error fetching dormant ties:', dormantError);
      if (process.env.NODE_ENV !== 'production') {
        const mockSuggestions = generateMockReconnections();
        const mockSummary = {
          total_dormant: mockSuggestions.length,
          by_tier: { 5: 0, 15: 1, 50: 1, 150: 0 },
          average_dormant_days: 225
        };
        return jsonWithCors(request, {
          suggestions: mockSuggestions.slice(query.offset || 0, (query.offset || 0) + (query.limit || 10)),
          summary: mockSummary
        });
      }
      return jsonWithCors(request, { error: 'Failed to fetch dormant tie suggestions' }, 500);
    }

    // Enhance suggestions with AI-generated conversation starters and channel recommendations
    const suggestions = (dormantData || []).map(dormant => {
      // Simple heuristics for suggested openers and channels
      // In production, this could use LLM to generate personalized openers

      let suggestedOpener = '';
      const firstName = dormant.name.split(' ')[0];

      if (dormant.last_interaction_summary) {
        suggestedOpener = `Hi ${firstName}! I was just thinking about our last conversation about ${dormant.last_interaction_summary.toLowerCase()}. How have things been going?`;
      } else if (dormant.how_met) {
        suggestedOpener = `Hey ${firstName}! Hope you're doing well. I was reminiscing about when we met at ${dormant.how_met}. Would love to catch up!`;
      } else {
        suggestedOpener = `Hi ${firstName}! Hope you're doing well. It's been too long since we last connected. Would love to hear how things are going with you!`;
      }

      // Channel suggestions based on relationship context and contact info
      const suggestedChannels = [];
      if (dormant.email) suggestedChannels.push('email');
      if (dormant.relationship_context === 'professional') {
        suggestedChannels.push('social_media'); // LinkedIn
      } else {
        suggestedChannels.push('text', 'social_media');
      }

      // Revival potential score heuristic (would be more sophisticated in production)
      let revivalPotentialScore = 50;
      if (dormant.tier <= 15) revivalPotentialScore += 30; // Closer relationships
      if (dormant.days_since_last_contact < 365) revivalPotentialScore += 20; // Recent enough
      if (dormant.last_interaction_summary) revivalPotentialScore += 15; // Has context
      revivalPotentialScore = Math.min(100, revivalPotentialScore);

      return {
        person_id: dormant.person_id,
        person: {
          id: dormant.person_id,
          name: dormant.name,
          email: dormant.email,
          avatar_url: dormant.avatar_url
        },
        tier: dormant.tier,
        last_contact_at: dormant.last_contact_at,
        days_since_last_contact: dormant.days_since_last_contact,
        how_met: dormant.how_met,
        relationship_context: dormant.relationship_context,
        last_interaction_summary: dormant.last_interaction_summary,
        suggested_opener: suggestedOpener,
        suggested_channels: suggestedChannels,
        revival_potential_score: revivalPotentialScore
      };
    });

    // Calculate summary statistics
    const tierCounts = suggestions.reduce((acc, s) => {
      acc[s.tier] = (acc[s.tier] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const summary = {
      total_dormant: suggestions.length,
      by_tier: tierCounts,
      average_dormant_days: suggestions.length > 0
        ? Math.round(suggestions.reduce((sum, s) => sum + s.days_since_last_contact, 0) / suggestions.length)
        : 0
    };

    return jsonWithCors(request, {
      suggestions,
      summary
    });
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}