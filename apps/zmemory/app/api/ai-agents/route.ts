import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { supabase as serviceClient } from '@/lib/supabase';
import { addUserIdIfNeeded } from '@/auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schemas
const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  vendor_id: z.string().min(1),
  service_id: z.string().optional(),
  model_name: z.string().optional(),
  system_prompt: z.string().optional(),
  configuration: z.record(z.any()).default({}),
  capabilities: z.record(z.any()).default({}),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  activity_score: z.number().min(0).max(1).default(0.2),
  is_active: z.boolean().default(true),
  is_favorite: z.boolean().default(false),
  feature_ids: z.array(z.string()).optional()
});

const UpdateAgentSchema = CreateAgentSchema.partial().extend({
  id: z.string().min(1)
});

const DeleteQuerySchema = z.object({
  id: z.string().min(1)
});

const GetQuerySchema = z.object({
  vendor_id: z.string().optional(),
  service_id: z.string().optional(),
  feature_id: z.string().optional(),
  is_active: z.string().optional(),
  is_favorite: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.string().default('activity_score'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.string().regex(/^\d+$/).transform(Number).default('50'),
  offset: z.string().regex(/^\d+$/).transform(Number).default('0')
});

/**
 * GET /api/ai-agents - Get all AI agents for the user
 */
async function handleGetAIAgents(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  const queryResult = GetQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: queryResult.error.errors
    }, { status: 400 });
  }

  const query = queryResult.data;

  if (!serviceClient) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Use the agent_summary view for enriched data
  let dbQuery = serviceClient
    .from('agent_summary')
    .select('*')
    .eq('user_id', userId)
    .range(query.offset, query.offset + query.limit - 1);

  // Apply filters
  if (query.vendor_id) {
    dbQuery = dbQuery.eq('vendor_id', query.vendor_id);
  }
  if (query.service_id) {
    dbQuery = dbQuery.eq('service_id', query.service_id);
  }
  if (query.is_active !== undefined) {
    dbQuery = dbQuery.eq('is_active', query.is_active === 'true');
  }
  if (query.is_favorite !== undefined) {
    dbQuery = dbQuery.eq('is_favorite', query.is_favorite === 'true');
  }
  if (query.tags) {
    const tagList = query.tags.split(',').map(t => t.trim());
    dbQuery = dbQuery.overlaps('tags', tagList);
  }
  if (query.search) {
    dbQuery = dbQuery.or(`name.ilike.%${query.search}%,description.ilike.%${query.search}%,notes.ilike.%${query.search}%`);
  }

  // Apply sorting
  const ascending = query.sort_order === 'asc';
  dbQuery = dbQuery.order(query.sort_by as any, { ascending });

  const { data: agents, error } = await dbQuery;

  if (error) {
    console.error('Error fetching AI agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }

  // Filter by feature if specified (post-query filtering)
  let filteredAgents = agents || [];
  if (query.feature_id && filteredAgents.length > 0) {
    filteredAgents = filteredAgents.filter((agent: any) => {
      const features = agent.features || [];
      return features.some((f: any) => f.id === query.feature_id);
    });
  }

  return NextResponse.json({ agents: filteredAgents });
}

/**
 * POST /api/ai-agents - Create a new AI agent
 */
async function handleCreateAIAgent(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const body = request.validatedBody!;
  const { feature_ids, ...agentData } = body;

  if (!serviceClient) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const agentPayload = { ...agentData };
  await addUserIdIfNeeded(agentPayload, userId, request);

  const { data: agent, error: agentError } = await serviceClient
    .from('ai_agents')
    .insert(agentPayload)
    .select()
    .single();

  if (agentError) {
    console.error('Error creating AI agent:', agentError);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }

  // Create feature mappings if provided
  if (feature_ids && feature_ids.length > 0 && agent) {
    const featureMappings = feature_ids.map((featureId: string, index: number) => ({
      agent_id: agent.id,
      feature_id: featureId,
      is_primary: index === 0
    }));

    for (const mapping of featureMappings) {
      await addUserIdIfNeeded(mapping, userId, request);
    }

    const { error: mappingError } = await serviceClient
      .from('agent_feature_mappings')
      .insert(featureMappings);

    if (mappingError) {
      console.error('Error creating feature mappings:', mappingError);
    }
  }

  // Return enriched agent data
  const { data: enrichedAgent } = await serviceClient
    .from('agent_summary')
    .select('*')
    .eq('id', agent.id)
    .eq('user_id', userId)
    .single();

  const finalAgent = enrichedAgent || agent;

  return NextResponse.json({ agent: finalAgent }, { status: 201 });
}

/**
 * PUT /api/ai-agents - Update an AI agent
 */
async function handleUpdateAIAgent(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const body = request.validatedBody!;
  const { id, feature_ids, ...updateData } = body;

  if (!serviceClient) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Update the agent
  const { data: agent, error: updateError } = await serviceClient
    .from('ai_agents')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating AI agent:', updateError);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Update feature mappings if provided
  if (feature_ids !== undefined) {
    await serviceClient
      .from('agent_feature_mappings')
      .delete()
      .eq('agent_id', id)
      .eq('user_id', userId);

    if (feature_ids.length > 0) {
      const featureMappings = feature_ids.map((featureId: string, index: number) => ({
        agent_id: id,
        feature_id: featureId,
        is_primary: index === 0
      }));

      for (const mapping of featureMappings) {
        await addUserIdIfNeeded(mapping, userId, request);
      }

      const { error: mappingError } = await serviceClient
        .from('agent_feature_mappings')
        .insert(featureMappings);

      if (mappingError) {
        console.error('Error updating feature mappings:', mappingError);
      }
    }
  }

  // Return enriched agent data
  const { data: enrichedAgent } = await serviceClient
    .from('agent_summary')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  const finalAgent = enrichedAgent || agent;

  return NextResponse.json({ agent: finalAgent });
}

/**
 * DELETE /api/ai-agents - Delete an AI agent
 */
async function handleDeleteAIAgent(
  request: EnhancedRequest
): Promise<NextResponse> {
  const userId = request.userId!;
  const { searchParams } = new URL(request.url);

  const queryResult = DeleteQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!queryResult.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: queryResult.error.errors
    }, { status: 400 });
  }

  const { id } = queryResult.data;

  if (!serviceClient) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Delete feature mappings first
  await serviceClient
    .from('agent_feature_mappings')
    .delete()
    .eq('agent_id', id)
    .eq('user_id', userId);

  // Delete the agent
  const { error } = await serviceClient
    .from('ai_agents')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting AI agent:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetAIAgents, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300
  }
});

export const POST = withStandardMiddleware(handleCreateAIAgent, {
  validation: {
    bodySchema: CreateAgentSchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

export const PUT = withStandardMiddleware(handleUpdateAIAgent, {
  validation: {
    bodySchema: UpdateAgentSchema
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
});

export const DELETE = withStandardMiddleware(handleDeleteAIAgent, {
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 50
  }
});

// Explicit OPTIONS handler for CORS preflight
export { OPTIONS_HANDLER as OPTIONS } from '@/lib/middleware';
