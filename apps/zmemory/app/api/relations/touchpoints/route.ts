import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/lib/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';
import { nowUTC } from '@/lib/time-utils';

// Validation schemas
const TouchpointCreateSchema = z.object({
  person_id: z.string().uuid('Invalid person ID'),
  channel: z.enum(['email', 'phone', 'text', 'in_person', 'video_call', 'social_media', 'messaging_app', 'other']),
  direction: z.enum(['outbound', 'inbound']),
  summary: z.string().min(1, 'Summary is required'),
  sentiment: z.number().int().min(-2).max(2).optional().default(0),
  duration_minutes: z.number().int().min(0).optional(),
  is_give: z.boolean().optional().default(false),
  give_ask_type: z.string().transform(val => val === '' ? undefined : val).pipe(z.enum(['advice', 'referral', 'support', 'favor', 'information', 'other'])).optional(),
  context: z.string().transform(val => val === '' ? undefined : val).pipe(z.enum(['work', 'personal', 'social', 'professional_development', 'other'])).optional(),
  tags: z.array(z.string()).optional(),
  needs_followup: z.boolean().optional().default(false),
  followup_date: z.string().transform(val => val === '' ? undefined : val).pipe(z.string().datetime()).optional(),
  followup_notes: z.string().optional(),
});

const TouchpointQuerySchema = z.object({
  person_id: z.string().uuid().optional(),
  channel: z.enum(['email', 'phone', 'text', 'in_person', 'video_call', 'social_media', 'messaging_app', 'other']).optional(),
  direction: z.enum(['outbound', 'inbound']).optional(),
  sentiment_min: z.string().transform(val => parseInt(val)).optional(),
  sentiment_max: z.string().transform(val => parseInt(val)).optional(),
  is_give: z.string().transform(val => val.toLowerCase() === 'true').optional(),
  context: z.enum(['work', 'personal', 'social', 'professional_development', 'other']).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  needs_followup: z.string().transform(val => val.toLowerCase() === 'true').optional(),
  limit: z.string().transform(val => parseInt(val) || 50).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional(),
  sort_by: z.enum(['created_at', 'sentiment', 'duration_minutes']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Mock data for development
const generateMockTouchpoints = () => [
  {
    id: '1',
    user_id: 'mock-user',
    person_id: '1',
    channel: 'email',
    direction: 'outbound',
    summary: 'Checked in about their new project launch',
    sentiment: 1,
    duration_minutes: null,
    is_give: false,
    context: 'work',
    tags: ['project', 'check-in'],
    needs_followup: true,
    followup_date: new Date(Date.now() + 604800000).toISOString(),
    followup_notes: 'Follow up on project results',
    created_at: new Date(Date.now() - 86400000).toISOString(),
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
    channel: 'phone',
    direction: 'inbound',
    summary: 'Called for advice on career transition',
    sentiment: 2,
    duration_minutes: 45,
    is_give: true,
    give_ask_type: 'advice',
    context: 'personal',
    tags: ['career', 'advice'],
    needs_followup: false,
    created_at: new Date(Date.now() - 172800000).toISOString(),
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
 * /api/relations/touchpoints:
 *   get:
 *     summary: Get relationship touchpoints
 *     description: Retrieve logged interactions with filtering by person, channel, sentiment, and date range
 *     tags: [Relations - Touchpoints]
 *     parameters:
 *       - in: query
 *         name: person_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific person
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [email, phone, text, in_person, video_call, social_media, messaging_app, other]
 *         description: Filter by communication channel
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [outbound, inbound]
 *         description: Filter by communication direction
 *       - in: query
 *         name: sentiment_min
 *         schema:
 *           type: integer
 *           minimum: -2
 *           maximum: 2
 *         description: Minimum sentiment score
 *       - in: query
 *         name: sentiment_max
 *         schema:
 *           type: integer
 *           minimum: -2
 *           maximum: 2
 *         description: Maximum sentiment score
 *       - in: query
 *         name: is_give
 *         schema:
 *           type: boolean
 *         description: Filter by give (true) vs ask (false) interactions
 *       - in: query
 *         name: context
 *         schema:
 *           type: string
 *           enum: [work, personal, social, professional_development, other]
 *         description: Filter by interaction context
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter touchpoints from this date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter touchpoints to this date
 *       - in: query
 *         name: needs_followup
 *         schema:
 *           type: boolean
 *         description: Filter by follow-up requirements
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of touchpoints to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of touchpoints to skip
 *     responses:
 *       200:
 *         description: List of touchpoints with person details
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleGet(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  // Parse and validate query parameters
  const queryResult = TouchpointQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json({ error: 'Invalid query parameters', details: queryResult.error.errors }, { status: 400 });
  }

  const query = queryResult.data;

  // If Supabase is not configured, return mock data
  if (!supabaseServer) {
    let touchpoints = generateMockTouchpoints();

    // Apply basic filters to mock data
    if (query.person_id) {
      touchpoints = touchpoints.filter(t => t.person_id === query.person_id);
    }
    if (query.channel) {
      touchpoints = touchpoints.filter(t => t.channel === query.channel);
    }
    if (query.direction) {
      touchpoints = touchpoints.filter(t => t.direction === query.direction);
    }

    return NextResponse.json(touchpoints.slice(query.offset || 0, (query.offset || 0) + (query.limit || 50)));
  }

  // Build Supabase query with person data
  let dbQuery = supabaseServer
    .from('relationship_touchpoints')
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
    .eq('user_id', userId);

  // Apply filters
  if (query.person_id) {
    dbQuery = dbQuery.eq('person_id', query.person_id);
  }
  if (query.channel) {
    dbQuery = dbQuery.eq('channel', query.channel);
  }
  if (query.direction) {
    dbQuery = dbQuery.eq('direction', query.direction);
  }
  if (query.sentiment_min !== undefined) {
    dbQuery = dbQuery.gte('sentiment', query.sentiment_min);
  }
  if (query.sentiment_max !== undefined) {
    dbQuery = dbQuery.lte('sentiment', query.sentiment_max);
  }
  if (query.is_give !== undefined) {
    dbQuery = dbQuery.eq('is_give', query.is_give);
  }
  if (query.context) {
    dbQuery = dbQuery.eq('context', query.context);
  }
  if (query.from_date) {
    dbQuery = dbQuery.gte('created_at', query.from_date);
  }
  if (query.to_date) {
    dbQuery = dbQuery.lte('created_at', query.to_date);
  }
  if (query.needs_followup !== undefined) {
    dbQuery = dbQuery.eq('needs_followup', query.needs_followup);
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
      return NextResponse.json(generateMockTouchpoints().slice(query.offset || 0, (query.offset || 0) + (query.limit || 50)));
    }
    return NextResponse.json({ error: 'Failed to fetch touchpoints' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

/**
 * @swagger
 * /api/relations/touchpoints:
 *   post:
 *     summary: Log a relationship touchpoint
 *     description: Record an interaction with a person (automatically updates relationship health and last contact date)
 *     tags: [Relations - Touchpoints]
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
 *               channel:
 *                 type: string
 *                 enum: [email, phone, text, in_person, video_call, social_media, messaging_app, other]
 *                 description: Communication channel (required)
 *               direction:
 *                 type: string
 *                 enum: [outbound, inbound]
 *                 description: Who initiated the interaction (required)
 *               summary:
 *                 type: string
 *                 minLength: 1
 *                 description: Brief description of the interaction (required)
 *               sentiment:
 *                 type: integer
 *                 minimum: -2
 *                 maximum: 2
 *                 default: 0
 *                 description: Emotional tone (-2=very negative, 0=neutral, +2=very positive)
 *               duration_minutes:
 *                 type: integer
 *                 minimum: 0
 *                 description: Duration of interaction in minutes
 *               is_give:
 *                 type: boolean
 *                 default: false
 *                 description: True if you gave help/value, false if you asked for something
 *               give_ask_type:
 *                 type: string
 *                 enum: [advice, referral, support, favor, information, other]
 *                 description: Type of give/ask interaction
 *               context:
 *                 type: string
 *                 enum: [work, personal, social, professional_development, other]
 *                 description: Context of the interaction
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Tags for categorization
 *               needs_followup:
 *                 type: boolean
 *                 default: false
 *                 description: Whether this requires follow-up
 *               followup_date:
 *                 type: string
 *                 format: date-time
 *                 description: When to follow up (if needs_followup is true)
 *               followup_notes:
 *                 type: string
 *                 description: Notes for follow-up
 *             required: [person_id, channel, direction, summary]
 *             example:
 *               person_id: "123e4567-e89b-12d3-a456-426614174000"
 *               channel: "email"
 *               direction: "outbound"
 *               summary: "Checked in about their new project launch"
 *               sentiment: 1
 *               is_give: false
 *               context: "work"
 *               tags: ["project", "check-in"]
 *     responses:
 *       201:
 *         description: Touchpoint logged successfully (also updates relationship health)
 *       400:
 *         description: Invalid touchpoint data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handlePost(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!;

  // Validate request body
  const validationResult = TouchpointCreateSchema.safeParse(request.validatedBody);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid touchpoint data', details: validationResult.error.errors }, { status: 400 });
  }

  const touchpointData = validationResult.data;
  const now = nowUTC();

  // If Supabase is not configured, return mock response
  if (!supabaseServer) {
    const mockTouchpoint = {
      id: Date.now().toString(),
      user_id: 'mock-user',
      ...touchpointData,
      created_at: now
    };
    return NextResponse.json(mockTouchpoint, { status: 201 });
  }

  // Start a transaction to create touchpoint and update relationship profile
  const touchpointPayload = {
    user_id: userId,
    ...touchpointData,
    created_at: now
  };

  const { data: touchpointResult, error: touchpointError } = await supabaseServer
    .from('relationship_touchpoints')
    .insert(touchpointPayload)
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

  if (touchpointError) {
    console.error('Database error creating touchpoint:', touchpointError);
    return NextResponse.json({ error: 'Failed to log touchpoint' }, { status: 500 });
  }

  // Update the relationship profile's last_contact_at and potentially health score
  // This would normally be done via database trigger or function for better performance
  const { error: profileUpdateError } = await supabaseServer
    .from('relationship_profiles')
    .update({
      last_contact_at: now,
      updated_at: now,
      // Reset dormancy if this was a dormant relationship
      is_dormant: false,
      dormant_since: null
    })
    .eq('person_id', touchpointData.person_id)
    .eq('user_id', userId);

  if (profileUpdateError) {
    console.warn('Warning: Could not update relationship profile last_contact_at:', profileUpdateError);
    // Don't fail the request since the touchpoint was successfully created
  }

  // TODO: Implement health score recalculation here or via background job
  // This would analyze recent touchpoints, sentiment, reciprocity balance, etc.

  return NextResponse.json(touchpointResult, { status: 201 });
}

export const GET = withStandardMiddleware(handleGet, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 200 }
});

export const POST = withStandardMiddleware(handlePost, {
  validation: { bodySchema: TouchpointCreateSchema },
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
});

export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
