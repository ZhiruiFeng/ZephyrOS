import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getUserIdFromRequest, addUserIdIfNeeded } from '@/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security';
import { z } from 'zod';
import { nowUTC } from '@/lib/time-utils';

// Validation schemas
const RelationshipProfileCreateSchema = z.object({
  person_id: z.string().uuid('Invalid person ID'),
  tier: z.number().int().refine(val => [5, 15, 50, 150].includes(val), 'Tier must be 5, 15, 50, or 150'),
  cadence_days: z.number().int().min(1).max(365).optional().default(30),
  reason_for_tier: z.string().optional(),
  relationship_context: z.string().optional(),
  how_met: z.string().optional(),
});

const RelationshipProfileUpdateSchema = z.object({
  tier: z.number().int().refine(val => [5, 15, 50, 150].includes(val), 'Tier must be 5, 15, 50, or 150').optional(),
  cadence_days: z.number().int().min(1).max(365).optional(),
  reason_for_tier: z.string().optional(),
  relationship_context: z.string().optional(),
  how_met: z.string().optional(),
  is_dormant: z.boolean().optional(),
});

const ProfileQuerySchema = z.object({
  tier: z.string().transform(val => parseInt(val)).optional(),
  is_dormant: z.string().transform(val => val.toLowerCase() === 'true').optional(),
  min_health_score: z.string().transform(val => parseInt(val)).optional(),
  max_health_score: z.string().transform(val => parseInt(val)).optional(),
  limit: z.string().transform(val => parseInt(val) || 50).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional(),
  sort_by: z.enum(['health_score', 'last_contact_at', 'tier', 'created_at']).optional().default('health_score'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Mock data for development
const generateMockProfiles = () => [
  {
    id: '1',
    user_id: 'mock-user',
    person_id: '1',
    tier: 50,
    cadence_days: 30,
    last_contact_at: new Date(Date.now() - 604800000).toISOString(),
    health_score: 85,
    reciprocity_balance: 2,
    is_dormant: false,
    reason_for_tier: 'Professional colleague',
    relationship_context: 'work',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    person: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Tech Corp'
    }
  },
  {
    id: '2',
    user_id: 'mock-user',
    person_id: '2',
    tier: 15,
    cadence_days: 14,
    last_contact_at: new Date(Date.now() - 1209600000).toISOString(),
    health_score: 60,
    reciprocity_balance: -1,
    is_dormant: false,
    reason_for_tier: 'Close friend',
    relationship_context: 'personal',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    person: {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@company.com',
      company: 'StartupXYZ'
    }
  }
];

/**
 * @swagger
 * /api/relations/profiles:
 *   get:
 *     summary: Get relationship profiles
 *     description: Retrieve relationship profiles with filtering by tier, health score, and dormancy status
 *     tags: [Relations - Profiles]
 *     parameters:
 *       - in: query
 *         name: tier
 *         schema:
 *           type: integer
 *           enum: [5, 15, 50, 150]
 *         description: Filter by Dunbar tier
 *       - in: query
 *         name: is_dormant
 *         schema:
 *           type: boolean
 *         description: Filter by dormancy status
 *       - in: query
 *         name: min_health_score
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         description: Minimum health score
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
 *           default: 50
 *         description: Maximum number of profiles to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of profiles to skip
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [health_score, last_contact_at, tier, created_at]
 *           default: health_score
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of relationship profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   person_id:
 *                     type: string
 *                   tier:
 *                     type: integer
 *                     enum: [5, 15, 50, 150]
 *                   health_score:
 *                     type: integer
 *                   last_contact_at:
 *                     type: string
 *                   cadence_days:
 *                     type: integer
 *                   is_dormant:
 *                     type: boolean
 *                   person:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       company:
 *                         type: string
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
    const rlKey = `${getClientIP(request)}:GET:/api/relations/profiles`;
    if (isRateLimited(rlKey, 15 * 60 * 1000, 200)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryResult = ProfileQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!queryResult.success) {
      return jsonWithCors(request, { error: 'Invalid query parameters', details: queryResult.error.errors }, 400);
    }

    const query = queryResult.data;

    // If Supabase is not configured, return mock data
    if (!supabaseServer) {
      let profiles = generateMockProfiles();

      // Apply basic filters to mock data
      if (query.tier) {
        profiles = profiles.filter(p => p.tier === query.tier);
      }
      if (query.is_dormant !== undefined) {
        profiles = profiles.filter(p => p.is_dormant === query.is_dormant);
      }
      if (query.min_health_score !== undefined) {
        profiles = profiles.filter(p => p.health_score >= query.min_health_score!);
      }
      if (query.max_health_score !== undefined) {
        profiles = profiles.filter(p => p.health_score <= query.max_health_score!);
      }

      return jsonWithCors(request, profiles.slice(query.offset || 0, (query.offset || 0) + (query.limit || 50)));
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Build Supabase query with person data
    let dbQuery = supabaseServer
      .from('relationship_profiles')
      .select(`
        *,
        person:people(
          id,
          name,
          email,
          phone,
          company,
          job_title,
          location,
          avatar_url
        )
      `)
      .eq('user_id', userId);

    // Apply filters
    if (query.tier) {
      dbQuery = dbQuery.eq('tier', query.tier);
    }
    if (query.is_dormant !== undefined) {
      dbQuery = dbQuery.eq('is_dormant', query.is_dormant);
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
    dbQuery = dbQuery.range(query.offset || 0, (query.offset || 0) + (query.limit || 50) - 1);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Database error:', error);
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, generateMockProfiles().slice(query.offset || 0, (query.offset || 0) + (query.limit || 50)));
      }
      return jsonWithCors(request, { error: 'Failed to fetch relationship profiles' }, 500);
    }

    return jsonWithCors(request, data || []);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

/**
 * @swagger
 * /api/relations/profiles:
 *   post:
 *     summary: Create a relationship profile
 *     description: Create or update a relationship profile for a person (assigns them to a Dunbar tier)
 *     tags: [Relations - Profiles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               person_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the person (required)
 *               tier:
 *                 type: integer
 *                 enum: [5, 15, 50, 150]
 *                 description: Dunbar tier (5=intimate, 15=close, 50=meaningful, 150=stable)
 *               cadence_days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 30
 *                 description: How often to check in (days)
 *               reason_for_tier:
 *                 type: string
 *                 description: Why this person is in this tier
 *               relationship_context:
 *                 type: string
 *                 description: Context of relationship (work, personal, etc.)
 *               how_met:
 *                 type: string
 *                 description: How you met this person
 *             required: [person_id, tier]
 *             example:
 *               person_id: "123e4567-e89b-12d3-a456-426614174000"
 *               tier: 50
 *               cadence_days: 30
 *               reason_for_tier: "Professional colleague with good collaboration"
 *               relationship_context: "work"
 *               how_met: "Conference networking event"
 *     responses:
 *       201:
 *         description: Relationship profile created successfully
 *       400:
 *         description: Invalid profile data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Profile already exists for this person
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const postKey = `${getClientIP(request)}:POST:/api/relations/profiles`;
    if (isRateLimited(postKey, 15 * 60 * 1000, 50)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const body = await request.json();

    // Validate request body
    const validationResult = RelationshipProfileCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return jsonWithCors(request, { error: 'Invalid profile data', details: validationResult.error.errors }, 400);
    }

    const profileData = validationResult.data;
    const now = nowUTC();

    // If Supabase is not configured, return mock response
    if (!supabaseServer) {
      const mockProfile = {
        id: Date.now().toString(),
        user_id: 'mock-user',
        ...profileData,
        health_score: 100,
        reciprocity_balance: 0,
        is_dormant: false,
        created_at: now,
        updated_at: now
      };
      return jsonWithCors(request, mockProfile, 201);
    }

    // Enforce authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    // Set default cadence based on tier if not provided
    let cadenceDays = profileData.cadence_days;
    if (!cadenceDays) {
      const defaultCadences = { 5: 7, 15: 14, 50: 30, 150: 90 };
      cadenceDays = defaultCadences[profileData.tier as keyof typeof defaultCadences];
    }

    // Create relationship profile
    const profilePayload = {
      ...profileData,
      cadence_days: cadenceDays,
      health_score: 100, // New relationships start with perfect health
      reciprocity_balance: 0,
      is_dormant: false,
      created_at: now,
      updated_at: now
    };

    // Add user_id to payload (always needed since we use service role client)
    await addUserIdIfNeeded(profilePayload, userId, request);

    const { data, error } = await supabaseServer
      .from('relationship_profiles')
      .insert(profilePayload)
      .select(`
        *,
        person:people(
          id,
          name,
          email,
          company,
          job_title,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      if (error.code === '23505') { // Unique constraint violation
        return jsonWithCors(request, { error: 'Relationship profile already exists for this person' }, 409);
      }
      return jsonWithCors(request, { error: 'Failed to create relationship profile' }, 500);
    }

    return jsonWithCors(request, data, 201);
  } catch (error) {
    console.error('API error:', error);
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}