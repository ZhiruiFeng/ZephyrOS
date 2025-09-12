import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../lib/auth'
import { AIInteraction, CreateAIInteractionRequest, UpdateAIInteractionRequest } from '../../../types'

// Helper function to add CORS headers to responses
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// Create Supabase client for service operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

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
})

const UpdateInteractionSchema = CreateInteractionSchema.partial().omit({ agent_id: true })

// GET /api/ai-interactions - Get AI interactions
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return addCorsHeaders(NextResponse.json({ error: 'Database not configured' }, { status: 500 }))
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { searchParams } = new URL(request.url)
    const agent_id = searchParams.get('agent_id')
    const interaction_type_id = searchParams.get('interaction_type_id') || searchParams.get('type') // Support both
    const status = searchParams.get('status')
    const tags = searchParams.get('tags')
    const keywords = searchParams.get('keywords')
    const min_satisfaction = searchParams.get('min_satisfaction')
    const min_usefulness = searchParams.get('min_usefulness')
    const min_cost = searchParams.get('min_cost')
    const max_cost = searchParams.get('max_cost')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const search = searchParams.get('search')
    const sort_by = searchParams.get('sort_by') || 'created_at'
    const sort_order = searchParams.get('sort_order') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Use the recent_interactions view for enriched data
    let query = supabase
      .from('recent_interactions')
      .select('*')
      .eq('user_id', userId)
      .range(offset, offset + limit - 1)

    // Apply filters
    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }

    if (interaction_type_id) {
      query = query.eq('interaction_type_id', interaction_type_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim())
      query = query.overlaps('tags', tagList)
    }

    if (keywords) {
      const keywordList = keywords.split(',').map(k => k.trim())
      query = query.overlaps('keywords', keywordList)
    }

    if (min_satisfaction) {
      query = query.gte('satisfaction_rating', parseInt(min_satisfaction))
    }

    if (min_usefulness) {
      query = query.gte('usefulness_rating', parseInt(min_usefulness))
    }

    if (min_cost) {
      query = query.gte('total_cost', parseFloat(min_cost))
    }

    if (max_cost) {
      query = query.lte('total_cost', parseFloat(max_cost))
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,content_preview.ilike.%${search}%`)
    }

    // Apply sorting
    const ascending = sort_order === 'asc'
    query = query.order(sort_by as any, { ascending })

    const { data: interactions, error } = await query

    if (error) {
      console.error('Error fetching AI interactions:', error)
      return addCorsHeaders(NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 }))
    }

    return addCorsHeaders(NextResponse.json({ interactions }))
  } catch (error) {
    console.error('Unexpected error:', error)
    return addCorsHeaders(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// POST /api/ai-interactions - Create a new AI interaction
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return addCorsHeaders(NextResponse.json({ error: 'Database not configured' }, { status: 500 }))
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const body = await request.json()
    
    let validatedData
    try {
      validatedData = CreateInteractionSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return addCorsHeaders(NextResponse.json({ 
          error: 'Invalid input data', 
          details: validationError.errors
        }, { status: 400 }))
      }
      throw validationError
    }

    // Verify the agent belongs to the user
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', validatedData.agent_id)
      .eq('user_id', userId)
      .single()

    if (agentError || !agent) {
      return addCorsHeaders(NextResponse.json({ error: 'Agent not found or access denied' }, { status: 404 }))
    }

    const { data: interaction, error } = await supabase
      .from('ai_interactions')
      .insert({
        ...validatedData,
        user_id: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating AI interaction:', error)
      return addCorsHeaders(NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 }))
    }

    // The trigger will automatically update agent stats and activity score
    // No manual update needed with the new schema

    return addCorsHeaders(NextResponse.json({ interaction }, { status: 201 }))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return addCorsHeaders(NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 }))
    }
    console.error('Unexpected error:', error)
    return addCorsHeaders(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// PUT /api/ai-interactions - Update an AI interaction
export async function PUT(request: NextRequest) {
  try {
    if (!supabase) {
      return addCorsHeaders(NextResponse.json({ error: 'Database not configured' }, { status: 500 }))
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return addCorsHeaders(NextResponse.json({ error: 'Interaction ID is required' }, { status: 400 }))
    }

    const validatedData = UpdateInteractionSchema.parse(updateData)

    const { data: interaction, error } = await supabase
      .from('ai_interactions')
      .update(validatedData)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating AI interaction:', error)
      return addCorsHeaders(NextResponse.json({ error: 'Failed to update interaction' }, { status: 500 }))
    }

    if (!interaction) {
      return addCorsHeaders(NextResponse.json({ error: 'Interaction not found' }, { status: 404 }))
    }

    // Get enriched interaction data from view
    const { data: enrichedInteraction, error: enrichError } = await supabase
      .from('recent_interactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    const finalInteraction = enrichedInteraction || interaction

    return addCorsHeaders(NextResponse.json({ interaction: finalInteraction }))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return addCorsHeaders(NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 }))
    }
    console.error('Unexpected error:', error)
    return addCorsHeaders(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// DELETE /api/ai-interactions - Delete an AI interaction
export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return addCorsHeaders(NextResponse.json({ error: 'Database not configured' }, { status: 500 }))
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return addCorsHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return addCorsHeaders(NextResponse.json({ error: 'Interaction ID is required' }, { status: 400 }))
    }

    const { error } = await supabase
      .from('ai_interactions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting AI interaction:', error)
      return addCorsHeaders(NextResponse.json({ error: 'Failed to delete interaction' }, { status: 500 }))
    }

    return addCorsHeaders(NextResponse.json({ success: true }))
  } catch (error) {
    console.error('Unexpected error:', error)
    return addCorsHeaders(NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
