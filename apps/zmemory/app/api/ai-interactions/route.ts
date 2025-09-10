import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../lib/auth'

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

// Validation schemas
const CreateInteractionSchema = z.object({
  agent_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  interaction_type: z.enum(['conversation', 'brainstorming', 'coding', 'research', 'creative', 'analysis', 'other']).default('conversation'),
  external_link: z.string().optional().refine((val) => !val || z.string().url().safeParse(val).success, {
    message: "Must be a valid URL or empty"
  }),
  external_id: z.string().optional(),
  content_preview: z.string().optional(),
  tags: z.array(z.string()).default([]),
  satisfaction_rating: z.number().min(1).max(5).optional(),
  usefulness_rating: z.number().min(1).max(5).optional(),
  feedback_notes: z.string().optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  duration_minutes: z.number().min(0).optional()
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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const interaction_type = searchParams.get('type')
    const tag = searchParams.get('tag')

    let query = supabase
      .from('ai_interactions')
      .select(`
        *,
        ai_agents!inner(
          id,
          name,
          vendor,
          features
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }

    if (interaction_type) {
      query = query.eq('interaction_type', interaction_type)
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

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

    // 手动更新代理信息（替代触发器）
    try {
      // 先获取当前的使用计数
      const { data: currentAgent } = await supabase
        .from('ai_agents')
        .select('usage_count')
        .eq('id', validatedData.agent_id)
        .eq('user_id', userId)
        .single()
      
      if (currentAgent) {
        await supabase
          .from('ai_agents')
          .update({
            last_used_at: interaction.created_at,
            usage_count: (currentAgent.usage_count || 0) + 1
          })
          .eq('id', validatedData.agent_id)
          .eq('user_id', userId)
      }
    } catch (updateError) {
      // 不阻止交互创建，静默处理代理统计更新失败
    }

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
      .select(`
        *,
        ai_agents!inner(
          id,
          name,
          vendor,
          features
        )
      `)
      .single()

    if (error) {
      console.error('Error updating AI interaction:', error)
      return addCorsHeaders(NextResponse.json({ error: 'Failed to update interaction' }, { status: 500 }))
    }

    if (!interaction) {
      return addCorsHeaders(NextResponse.json({ error: 'Interaction not found' }, { status: 404 }))
    }

    return addCorsHeaders(NextResponse.json({ interaction }))
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
