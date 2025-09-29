import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getUserIdFromRequest } from '@/auth'
import { AITaskCreateSchema, AITasksQuerySchema } from '@/validation'
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '@/lib/security'

export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    if (!supabase) {
      return jsonWithCors(request, { error: 'Database not configured' }, 500);
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const { searchParams } = new URL(request.url)
    const parsed = AITasksQuerySchema.parse(Object.fromEntries(searchParams.entries()))

    let query = supabase
      .from('ai_tasks')
      .select('*')
      .eq('user_id', userId)

    if (parsed.task_id) query = query.eq('task_id', parsed.task_id)
    if (parsed.agent_id) query = query.eq('agent_id', parsed.agent_id)
    if (parsed.task_type) query = query.eq('task_type', parsed.task_type)
    if (parsed.mode) query = query.eq('mode', parsed.mode)
    if (parsed.status) query = query.eq('status', parsed.status)
    if (parsed.assigned_from) query = query.gte('assigned_at', parsed.assigned_from)
    if (parsed.assigned_to) query = query.lte('assigned_at', parsed.assigned_to)
    if (parsed.due_from) query = query.gte('due_at', parsed.due_from)
    if (parsed.due_to) query = query.lte('due_at', parsed.due_to)

    // simple search on objective / deliverables / context
    if (parsed.search) {
      query = query.or(
        `objective.ilike.%${parsed.search}%,deliverables.ilike.%${parsed.search}%,context.ilike.%${parsed.search}%`
      )
    }

    const ascending = parsed.sort_order === 'asc'
    query = query.order(parsed.sort_by as any, { ascending })
      .range(parsed.offset, parsed.offset + parsed.limit - 1)

    const { data, error } = await query
    if (error) {
      console.error('Error fetching ai_tasks:', error)
      return jsonWithCors(request, { error: 'Failed to fetch ai_tasks' }, 500);
    }

    return jsonWithCors(request, { ai_tasks: data || [] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithCors(request, { error: 'Invalid query params', details: error.errors }, 400);
    }
    console.error('Unexpected error:', error)
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 50)) { // Stricter limit for POST
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    if (!supabase) {
      return jsonWithCors(request, { error: 'Database not configured' }, 500);
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const body = await request.json()
    const payload = AITaskCreateSchema.parse(body)

    // create ai_task
    const { data: created, error } = await supabase
      .from('ai_tasks')
      .insert({
        ...payload,
        user_id: userId,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating ai_task:', error)
      return jsonWithCors(request, { error: 'Failed to create ai_task' }, 500);
    }

    return jsonWithCors(request, { ai_task: created }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithCors(request, { error: 'Invalid input data', details: error.errors }, 400);
    }
    console.error('Unexpected error:', error)
    const errorMessage = sanitizeErrorMessage(error);
    return jsonWithCors(request, { error: errorMessage }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}


