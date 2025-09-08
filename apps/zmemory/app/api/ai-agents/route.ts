import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Validation schemas
const AgentVendorSchema = z.enum(['ChatGPT', 'Claude', 'Perplexity', 'ElevenLabs', 'Toland', 'Other'])
const AgentFeatureSchema = z.enum(['Brainstorming', 'Daily Q&A', 'Coding', 'MCP', 'News Search', 'Comet', 'TTS', 'STT', 'Companion', 'Speech'])

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  vendor: AgentVendorSchema,
  features: z.array(AgentFeatureSchema).default([]),
  notes: z.string().optional(),
  activity_score: z.number().min(0).max(1).default(0.2),
  configuration: z.record(z.any()).default({})
})

const UpdateAgentSchema = CreateAgentSchema.partial()

const CreateInteractionSchema = z.object({
  agent_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  interaction_type: z.enum(['conversation', 'brainstorming', 'coding', 'research', 'creative', 'analysis', 'other']).default('conversation'),
  external_link: z.string().url().optional(),
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

// GET /api/ai-agents - Get all AI agents for the user
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vendor = searchParams.get('vendor')
    const feature = searchParams.get('feature')
    const active_only = searchParams.get('active_only') === 'true'

    let query = supabase
      .from('ai_agents')
      .select(`
        *,
        ai_interactions!inner(
          id,
          title,
          created_at,
          satisfaction_rating,
          usefulness_rating
        )
      `)
      .eq('user_id', user.id)
      .order('activity_score', { ascending: false })

    if (vendor) {
      query = query.eq('vendor', vendor)
    }

    if (feature) {
      query = query.contains('features', [feature])
    }

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data: agents, error } = await query

    if (error) {
      console.error('Error fetching AI agents:', error)
      return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
    }

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/ai-agents - Create a new AI agent
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateAgentSchema.parse(body)

    const { data: agent, error } = await supabase
      .from('ai_agents')
      .insert({
        ...validatedData,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating AI agent:', error)
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
    }

    return NextResponse.json({ agent }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/ai-agents - Update an AI agent
export async function PUT(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }

    const validatedData = UpdateAgentSchema.parse(updateData)

    const { data: agent, error } = await supabase
      .from('ai_agents')
      .update(validatedData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating AI agent:', error)
      return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
    }

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 })
    }
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/ai-agents - Delete an AI agent
export async function DELETE(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting AI agent:', error)
      return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
