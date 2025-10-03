import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabaseServer } from '@/lib/supabase-server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schemas for new extensible schema
const CreateInteractionSchema = z.object({
  agent_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  interaction_type_id: z.string().default('conversation'), // References interaction_types table
  external_link: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "Must be a valid URL or empty"
  }),
  external_id: z.string().optional(),
  external_metadata: z.record(z.any()).default({}),
  content_preview: z.string().optional(),
  full_content: z.string().optional(),
  input_tokens: z.number().min(0).optional(),
  output_tokens: z.number().min(0).optional(),
  total_cost: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  satisfaction_rating: z.number().min(1).max(5).optional(),
  usefulness_rating: z.number().min(1).max(5).optional(),
  feedback_notes: z.string().optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  duration_minutes: z.number().min(0).optional(),
  status: z.enum(['active', 'completed', 'archived', 'deleted']).default('completed')
});

const UpdateInteractionSchema = CreateInteractionSchema.partial().omit({ agent_id: true });

const InteractionQuerySchema = z.object({
  agent_id: z.string().uuid().optional(),
  interaction_type_id: z.string().optional(),
  type: z.string().optional(), // Alias for interaction_type_id
  status: z.string().optional(),
  tags: z.string().optional(),
  keywords: z.string().optional(),
  min_satisfaction: z.string().transform(val => parseInt(val)).optional(),
  min_usefulness: z.string().transform(val => parseInt(val)).optional(),
  min_cost: z.string().transform(val => parseFloat(val)).optional(),
  max_cost: z.string().transform(val => parseFloat(val)).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.string().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.string().transform(val => parseInt(val) || 50).optional(),
  offset: z.string().transform(val => parseInt(val) || 0).optional(),
});

/**
 * @swagger
 * /api/ai-interactions:
 *   get:
 *     summary: Get AI interactions
 *     description: Get AI interactions with filtering, sorting, and pagination
 *     tags: [AI Interactions]
 *     parameters:
 *       - in: query
 *         name: agent_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: interaction_type_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags
 *       - in: query
 *         name: keywords
 *         schema:
 *           type: string
 *         description: Comma-separated list of keywords
 *       - in: query
 *         name: min_satisfaction
 *         schema:
 *           type: integer
 *       - in: query
 *         name: min_usefulness
 *         schema:
 *           type: integer
 *       - in: query
 *         name: min_cost
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_cost
 *         schema:
 *           type: number
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           default: created_at
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: AI interactions retrieved successfully
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleGetInteractions(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  // Parse and validate query parameters
  const queryResult = InteractionQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: queryResult.error.errors
    }, { status: 400 });
  }

  const query = queryResult.data;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Use the recent_interactions view for enriched data
  let dbQuery = supabaseServer
    .from('recent_interactions')
    .select('*')
    .eq('user_id', userId)
    .range(query.offset || 0, (query.offset || 0) + (query.limit || 50) - 1);

  // Apply filters
  if (query.agent_id) {
    dbQuery = dbQuery.eq('agent_id', query.agent_id);
  }

  const interaction_type_id = query.interaction_type_id || query.type;
  if (interaction_type_id) {
    dbQuery = dbQuery.eq('interaction_type_id', interaction_type_id);
  }

  if (query.status) {
    dbQuery = dbQuery.eq('status', query.status);
  }

  if (query.tags) {
    const tagList = query.tags.split(',').map(t => t.trim());
    dbQuery = dbQuery.overlaps('tags', tagList);
  }

  if (query.keywords) {
    const keywordList = query.keywords.split(',').map(k => k.trim());
    dbQuery = dbQuery.overlaps('keywords', keywordList);
  }

  if (query.min_satisfaction !== undefined) {
    dbQuery = dbQuery.gte('satisfaction_rating', query.min_satisfaction);
  }

  if (query.min_usefulness !== undefined) {
    dbQuery = dbQuery.gte('usefulness_rating', query.min_usefulness);
  }

  if (query.min_cost !== undefined) {
    dbQuery = dbQuery.gte('total_cost', query.min_cost);
  }

  if (query.max_cost !== undefined) {
    dbQuery = dbQuery.lte('total_cost', query.max_cost);
  }

  if (query.date_from) {
    dbQuery = dbQuery.gte('created_at', query.date_from);
  }

  if (query.date_to) {
    dbQuery = dbQuery.lte('created_at', query.date_to);
  }

  if (query.search) {
    dbQuery = dbQuery.or(`title.ilike.%${query.search}%,description.ilike.%${query.search}%,content_preview.ilike.%${query.search}%`);
  }

  // Apply sorting
  const ascending = query.sort_order === 'asc';
  dbQuery = dbQuery.order(query.sort_by, { ascending });

  const { data: interactions, error } = await dbQuery;

  if (error) {
    console.error('Error fetching AI interactions:', error);
    return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
  }

  return NextResponse.json({ interactions });
}

/**
 * @swagger
 * /api/ai-interactions:
 *   post:
 *     summary: Create a new AI interaction
 *     description: Create a new AI interaction for tracking AI agent usage
 *     tags: [AI Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *               - title
 *             properties:
 *               agent_id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               interaction_type_id:
 *                 type: string
 *                 default: conversation
 *               external_link:
 *                 type: string
 *               external_id:
 *                 type: string
 *               external_metadata:
 *                 type: object
 *               content_preview:
 *                 type: string
 *               full_content:
 *                 type: string
 *               input_tokens:
 *                 type: number
 *               output_tokens:
 *                 type: number
 *               total_cost:
 *                 type: number
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *               satisfaction_rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               usefulness_rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               feedback_notes:
 *                 type: string
 *               started_at:
 *                 type: string
 *                 format: date-time
 *               ended_at:
 *                 type: string
 *                 format: date-time
 *               duration_minutes:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, completed, archived, deleted]
 *                 default: completed
 *     responses:
 *       201:
 *         description: Interaction created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Agent not found
 *       500:
 *         description: Server error
 */
async function handleCreateInteraction(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const validatedData = request.validatedBody!;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Verify the agent belongs to the user
  const { data: agent, error: agentError } = await supabaseServer
    .from('ai_agents')
    .select('id')
    .eq('id', validatedData.agent_id)
    .eq('user_id', userId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found or access denied' }, { status: 404 });
  }

  const interactionPayload = {
    ...validatedData,
    user_id: userId
  };

  const { data: interaction, error } = await supabaseServer
    .from('ai_interactions')
    .insert(interactionPayload)
    .select()
    .single();

  if (error) {
    console.error('Error creating AI interaction:', error);
    return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });
  }

  // The trigger will automatically update agent stats and activity score
  // No manual update needed with the new schema

  return NextResponse.json({ interaction }, { status: 201 });
}

/**
 * @swagger
 * /api/ai-interactions:
 *   put:
 *     summary: Update an AI interaction
 *     description: Update an existing AI interaction
 *     tags: [AI Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Interaction updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Interaction not found
 *       500:
 *         description: Server error
 */
async function handleUpdateInteraction(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const body = await request.json();
  const { id, ...updateData } = body;

  if (!id) {
    return NextResponse.json({ error: 'Interaction ID is required' }, { status: 400 });
  }

  const validationResult = UpdateInteractionSchema.safeParse(updateData);
  if (!validationResult.success) {
    return NextResponse.json({
      error: 'Invalid input data',
      details: validationResult.error.errors
    }, { status: 400 });
  }

  const validatedData = validationResult.data;

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data: interaction, error } = await supabaseServer
    .from('ai_interactions')
    .update(validatedData)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating AI interaction:', error);
    return NextResponse.json({ error: 'Failed to update interaction' }, { status: 500 });
  }

  if (!interaction) {
    return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
  }

  // Get enriched interaction data from view
  const { data: enrichedInteraction } = await supabaseServer
    .from('recent_interactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  const finalInteraction = enrichedInteraction || interaction;

  return NextResponse.json({ interaction: finalInteraction });
}

/**
 * @swagger
 * /api/ai-interactions:
 *   delete:
 *     summary: Delete an AI interaction
 *     description: Delete an existing AI interaction
 *     tags: [AI Interactions]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Interaction deleted successfully
 *       400:
 *         description: Interaction ID required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
async function handleDeleteInteraction(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Interaction ID is required' }, { status: 400 });
  }

  if (!supabaseServer) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { error } = await supabaseServer
    .from('ai_interactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting AI interaction:', error);
    return NextResponse.json({ error: 'Failed to delete interaction' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetInteractions, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const POST = withStandardMiddleware(handleCreateInteraction, {
  validation: {
    bodySchema: CreateInteractionSchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const PUT = withStandardMiddleware(handleUpdateInteraction, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const DELETE = withStandardMiddleware(handleDeleteInteraction, {
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
