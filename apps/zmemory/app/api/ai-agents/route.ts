import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getUserIdFromRequest } from '@/auth'
import { AIAgent, CreateAIAgentRequest, UpdateAIAgentRequest } from '../../../types'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'

// Create Supabase client for service operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Validation schemas for new extensible schema
const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  vendor_id: z.string().min(1), // References vendors table
  service_id: z.string().optional(), // References vendor_services table
  model_name: z.string().optional(),
  system_prompt: z.string().optional(),
  configuration: z.record(z.any()).default({}),
  capabilities: z.record(z.any()).default({}),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  activity_score: z.number().min(0).max(1).default(0.2),
  is_active: z.boolean().default(true),
  is_favorite: z.boolean().default(false),
  feature_ids: z.array(z.string()).optional() // For creating feature mappings
})

const UpdateAgentSchema = CreateAgentSchema.partial()

// Agent feature mapping schema
const CreateFeatureMappingSchema = z.object({
  feature_id: z.string().min(1),
  is_primary: z.boolean().default(false)
})

// GET /api/ai-agents - Get all AI agents for the user
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return jsonWithCors(request, { error: 'Database not configured' }, 500)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }

    const { searchParams } = new URL(request.url)
    const vendor_id = searchParams.get('vendor_id')
    const service_id = searchParams.get('service_id')
    const feature_id = searchParams.get('feature_id')
    const is_active = searchParams.get('is_active')
    const is_favorite = searchParams.get('is_favorite')
    const tags = searchParams.get('tags')
    const search = searchParams.get('search')
    const sort_by = searchParams.get('sort_by') || 'activity_score'
    const sort_order = searchParams.get('sort_order') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Use the agent_summary view for enriched data
    let query = supabase
      .from('agent_summary')
      .select('*')
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)

    // Apply filters
    if (vendor_id) {
      query = query.eq('vendor_id', vendor_id)
    }

    if (service_id) {
      query = query.eq('service_id', service_id)
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (is_favorite !== null) {
      query = query.eq('is_favorite', is_favorite === 'true')
    }

    if (tags) {
      // Search for any of the comma-separated tags
      const tagList = tags.split(',').map(t => t.trim())
      query = query.overlaps('tags', tagList)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,notes.ilike.%${search}%`)
    }

    // Handle feature filtering (requires join with agent_feature_mappings)
    if (feature_id) {
      // We'll need to filter this after the query since we're using the view
    }

    // Apply sorting
    const ascending = sort_order === 'asc'
    query = query.order(sort_by as any, { ascending })

    const { data: agents, error } = await query

    if (error) {
      console.error('Error fetching AI agents:', error)
      return jsonWithCors(request, { error: 'Failed to fetch agents' }, 500)
    }

    // Filter by feature if specified (post-query filtering)
    let filteredAgents = agents || []
    if (feature_id && filteredAgents.length > 0) {
      filteredAgents = filteredAgents.filter((agent: any) => {
        const features = agent.features || []
        return features.some((f: any) => f.id === feature_id)
      })
    }

    return jsonWithCors(request, { agents: filteredAgents })
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

// POST /api/ai-agents - Create a new AI agent
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return jsonWithCors(request, { error: 'Database not configured' }, 500)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }

    const body = await request.json()
    const { feature_ids, ...agentData } = CreateAgentSchema.parse(body)

    // Start a transaction-like process
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .insert({
        ...agentData,
        user_id: userId
      })
      .select()
      .single()

    if (agentError) {
      console.error('Error creating AI agent:', agentError)
      return jsonWithCors(request, { error: 'Failed to create agent' }, 500)
    }

    // Create feature mappings if provided
    if (feature_ids && feature_ids.length > 0 && agent) {
      const featureMappings = feature_ids.map((featureId, index) => ({
        agent_id: agent.id,
        feature_id: featureId,
        is_primary: index === 0, // First feature is primary
        user_id: userId
      }))

      const { error: mappingError } = await supabase
        .from('agent_feature_mappings')
        .insert(featureMappings)

      if (mappingError) {
        console.error('Error creating feature mappings:', mappingError)
        // Continue anyway, don't fail the agent creation
      }
    }

    // Return the created agent with features
    const { data: enrichedAgent, error: enrichError } = await supabase
      .from('agent_summary')
      .select('*')
      .eq('id', agent.id)
      .eq('user_id', userId)
      .single()

    const finalAgent = enrichedAgent || agent

    return jsonWithCors(request, { agent: finalAgent }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithCors(request, { error: 'Invalid input data', details: error.errors }, 400)
    }
    console.error('Unexpected error:', error)
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

// PUT /api/ai-agents - Update an AI agent
export async function PUT(request: NextRequest) {
  try {
    if (!supabase) {
      return jsonWithCors(request, { error: 'Database not configured' }, 500)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }

    const body = await request.json()
    const { id, feature_ids, ...updateData } = body

    if (!id) {
      return jsonWithCors(request, { error: 'Agent ID is required' }, 400)
    }

    const validatedData = UpdateAgentSchema.parse(updateData)

    // Update the agent
    const { data: agent, error: updateError } = await supabase
      .from('ai_agents')
      .update(validatedData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating AI agent:', updateError)
      return jsonWithCors(request, { error: 'Failed to update agent' }, 500)
    }

    if (!agent) {
      return jsonWithCors(request, { error: 'Agent not found' }, 404)
    }

    // Update feature mappings if provided
    if (feature_ids !== undefined) {
      // Remove existing mappings
      await supabase
        .from('agent_feature_mappings')
        .delete()
        .eq('agent_id', id)
        .eq('user_id', userId)

      // Add new mappings if any
      if (feature_ids.length > 0) {
        const featureMappings = feature_ids.map((featureId: string, index: number) => ({
          agent_id: id,
          feature_id: featureId,
          is_primary: index === 0,
          user_id: userId
        }))

        const { error: mappingError } = await supabase
          .from('agent_feature_mappings')
          .insert(featureMappings)

        if (mappingError) {
          console.error('Error updating feature mappings:', mappingError)
          // Continue anyway
        }
      }
    }

    // Return enriched agent data
    const { data: enrichedAgent, error: enrichError } = await supabase
      .from('agent_summary')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    const finalAgent = enrichedAgent || agent

    return jsonWithCors(request, { agent: finalAgent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithCors(request, { error: 'Invalid input data', details: error.errors }, 400)
    }
    console.error('Unexpected error:', error)
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

// DELETE /api/ai-agents - Delete an AI agent
export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return jsonWithCors(request, { error: 'Database not configured' }, 500)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return jsonWithCors(request, { error: 'Agent ID is required' }, 400)
    }

    // Delete feature mappings first (cascade should handle this, but let's be explicit)
    await supabase
      .from('agent_feature_mappings')
      .delete()
      .eq('agent_id', id)
      .eq('user_id', userId)

    // Delete the agent (interactions will be cascade deleted)
    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting AI agent:', error)
      return jsonWithCors(request, { error: 'Failed to delete agent' }, 500)
    }

    return jsonWithCors(request, { success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}
