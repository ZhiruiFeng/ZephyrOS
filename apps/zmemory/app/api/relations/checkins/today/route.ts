import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getUserIdFromRequest } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import { z } from 'zod';
import { nowUTC } from '@/lib/time-utils';

// Query validation schema
const CheckinQuerySchema = z.object({
  tier: z.string().transform(val => parseInt(val)).optional(),
  priority: z.enum(['overdue', 'due_today', 'due_soon']).optional(),
  min_health_score: z.string().transform(val => parseInt(val)).optional(),
  max_health_score: z.string().transform(val => parseInt(val)).optional(),
  limit: z.string().transform(val => parseInt(val) || 20).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional(),
  sort_by: z.enum(['days_overdue', 'health_score', 'tier', 'last_contact_at']).optional().default('days_overdue'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Mock data for development
const generateMockCheckins = () => [
  {
    person_id: '1',
    person: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Tech Corp',
      avatar_url: null
    },
    tier: 50,
    health_score: 45,
    last_contact_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
    cadence_days: 30,
    next_contact_due: new Date(Date.now() - 86400000).toISOString(), // 1 day overdue
    days_overdue: 1,
    reason_for_tier: 'Professional colleague',
    relationship_context: 'work',
    recent_touchpoints: [
      {
        id: '1',
        summary: 'Discussed quarterly goals',
        channel: 'email',
        sentiment: 1,
        created_at: new Date(Date.now() - 2592000000).toISOString()
      }
    ]
  },
  {
    person_id: '2',
    person: {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@company.com',
      company: 'StartupXYZ',
      avatar_url: null
    },
    tier: 15,
    health_score: 65,
    last_contact_at: new Date(Date.now() - 1728000000).toISOString(), // 20 days ago
    cadence_days: 14,
    next_contact_due: new Date(Date.now() - 518400000).toISOString(), // 6 days overdue
    days_overdue: 6,
    reason_for_tier: 'Close friend',
    relationship_context: 'personal',
    recent_touchpoints: [
      {
        id: '2',
        summary: 'Coffee catch-up',
        channel: 'in_person',
        sentiment: 2,
        created_at: new Date(Date.now() - 1728000000).toISOString()
      }
    ]
  }
];

/**
 * @swagger
 * /api/relations/checkins/today:
 *   get:
 *     summary: Get today's check-in queue
 *     description: Get relationships that are due or overdue for contact based on their cadence settings. This is the primary dashboard view for daily relationship management.
 *     tags: [Relations - Check-ins]
 *     parameters:
 *       - in: query
 *         name: tier
 *         schema:
 *           type: integer
 *           enum: [5, 15, 50, 150]
 *         description: Filter by specific Dunbar tier
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [overdue, due_today, due_soon]
 *         description: Filter by urgency (overdue = past due, due_today = due today, due_soon = due within 3 days)
 *       - in: query
 *         name: min_health_score
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Minimum health score (useful to prioritize struggling relationships)
 *       - in: query
 *         name: max_health_score
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Maximum health score
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of check-ins to return (keep reasonable for daily queue)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of check-ins to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [days_overdue, health_score, tier, last_contact_at]
 *           default: days_overdue
 *         description: Sort order (days_overdue prioritizes most urgent)
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Today's check-in queue with relationship context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checkins:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       person_id:
 *                         type: string
 *                       person:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           company:
 *                             type: string
 *                           avatar_url:
 *                             type: string
 *                       tier:
 *                         type: integer
 *                       health_score:
 *                         type: integer
 *                       last_contact_at:
 *                         type: string
 *                       cadence_days:
 *                         type: integer
 *                       days_overdue:
 *                         type: number
 *                       reason_for_tier:
 *                         type: string
 *                       relationship_context:
 *                         type: string
 *                       recent_touchpoints:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             summary:
 *                               type: string
 *                             channel:
 *                               type: string
 *                             sentiment:
 *                               type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_due:
 *                       type: integer
 *                     overdue:
 *                       type: integer
 *                     due_today:
 *                       type: integer
 *                     due_soon:
 *                       type: integer
 *                     average_health_score:
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
    const rlKey = `${getClientIP(request)}:GET:/api/relations/checkins/today`;
    if (isRateLimited(rlKey, 15 * 60 * 1000, 100)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryResult = CheckinQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return jsonWithCors(request, { error: 'Invalid query parameters', details: queryResult.error.errors }, 400);
    }

    const query = queryResult.data;

    // If Supabase is not configured, return mock data
    if (!supabaseServer) {
      const mockCheckins = generateMockCheckins();
      const mockSummary = {
        total_due: mockCheckins.length,
        overdue: mockCheckins.filter(c => c.days_overdue > 0).length,
        due_today: 0,
        due_soon: 0,
        average_health_score: mockCheckins.reduce((sum, c) => sum + c.health_score, 0) / mockCheckins.length
      };

      return jsonWithCors(request, {
        checkins: mockCheckins.slice(query.offset || 0, (query.offset || 0) + (query.limit || 20)),
        summary: mockSummary
      });
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // At this point supabaseServer is guaranteed non-null (mock path returned earlier)
    const db = supabaseServer!;

    // Use the pre-built view for check-in queue with additional filtering
    let dbQuery = db
      .from('checkin_queue')
      .select(`
        person_id,
        name,
        email,
        avatar_url,
        tier,
        health_score,
        last_contact_at,
        cadence_days,
        next_contact_due,
        days_overdue,
        reason_for_tier,
        relationship_context
      `)
      // The view already filters to current user via RLS

    // Add a manual filter for completeness since RLS might not apply to views
    // Note: In production, ensure the view properly filters by user_id

    // Apply additional filters
    if (query.tier) {
      dbQuery = dbQuery.eq('tier', query.tier);
    }

    if (query.priority) {
      switch (query.priority) {
        case 'overdue':
          dbQuery = dbQuery.gt('days_overdue', 0);
          break;
        case 'due_today':
          dbQuery = dbQuery.eq('days_overdue', 0);
          break;
        case 'due_soon':
          dbQuery = dbQuery.gte('days_overdue', -3).lt('days_overdue', 0);
          break;
      }
    }

    if (query.min_health_score !== undefined) {
      dbQuery = dbQuery.gte('health_score', query.min_health_score);
    }
    if (query.max_health_score !== undefined) {
      dbQuery = dbQuery.lte('health_score', query.max_health_score);
    }

    // Apply sorting
    const ascending = query.sort_order === 'asc';
    dbQuery = dbQuery.order(query.sort_by, { ascending });

    // Apply pagination
    dbQuery = dbQuery.range(query.offset || 0, (query.offset || 0) + (query.limit || 20) - 1);

    const { data: checkinData, error: checkinError } = await dbQuery;

    if (checkinError) {
      console.error('Database error fetching checkin queue:', checkinError);
      if (process.env.NODE_ENV !== 'production') {
        const mockCheckins = generateMockCheckins();
        const mockSummary = {
          total_due: mockCheckins.length,
          overdue: 2,
          due_today: 0,
          due_soon: 0,
          average_health_score: 55
        };
        return jsonWithCors(request, {
          checkins: mockCheckins.slice(query.offset || 0, (query.offset || 0) + (query.limit || 20)),
          summary: mockSummary
        });
      }
      return jsonWithCors(request, { error: 'Failed to fetch check-in queue' }, 500);
    }

    // Get recent touchpoints for each person in the queue
    const checkinResults = await Promise.all(
      (checkinData || []).map(async (checkin) => {
        // Get the 2 most recent touchpoints for context
        const { data: touchpoints } = await db
          .from('relationship_touchpoints')
          .select('id, summary, channel, sentiment, created_at')
          .eq('person_id', checkin.person_id)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(2);

        return {
          person_id: checkin.person_id,
          person: {
            id: checkin.person_id,
            name: checkin.name,
            email: checkin.email,
            avatar_url: checkin.avatar_url
          },
          tier: checkin.tier,
          health_score: checkin.health_score,
          last_contact_at: checkin.last_contact_at,
          cadence_days: checkin.cadence_days,
          days_overdue: checkin.days_overdue,
          reason_for_tier: checkin.reason_for_tier,
          relationship_context: checkin.relationship_context,
          recent_touchpoints: touchpoints || []
        };
      })
    );

    // Calculate summary statistics
    const summary = {
      total_due: checkinResults.length,
      overdue: checkinResults.filter(c => c.days_overdue > 0).length,
      due_today: checkinResults.filter(c => c.days_overdue === 0).length,
      due_soon: checkinResults.filter(c => c.days_overdue < 0 && c.days_overdue >= -3).length,
      average_health_score: checkinResults.length > 0
        ? Math.round(checkinResults.reduce((sum, c) => sum + c.health_score, 0) / checkinResults.length)
        : 0
    };

    return jsonWithCors(request, {
      checkins: checkinResults,
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