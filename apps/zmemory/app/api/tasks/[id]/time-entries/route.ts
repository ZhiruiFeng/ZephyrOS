import { NextRequest } from 'next/server'
import { createClientForRequest, getUserIdFromRequest } from '../../../../../lib/auth'
import { supabase as serviceClient } from '../../../../../lib/supabase'
import { TimeEntriesQuerySchema, TimeEntryCreateSchema } from '../../../../../lib/validators'
import { createOptionsResponse, jsonWithCors } from '../../../../../lib/security'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        // Dev fallback: allow UI to open modal without auth and show empty entries
        return jsonWithCors(request, { entries: [] })
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }
    const client = createClientForRequest(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const searchParams = new URL(request.url).searchParams
    const parsed = TimeEntriesQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) return jsonWithCors(request, { error: 'Invalid query', details: parsed.error.errors }, 400)
    const { from, to, limit, offset } = parsed.data

    let query = client
      .from('task_time_entries')
      .select(`
        id, task_id, start_at, end_at, duration_minutes, note, source,
        task:tasks(title),
        category:categories(name, color)
      `)
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .order('start_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (from) query = query.gte('start_at', from)
    if (to) query = query.lte('start_at', to)

    const { data, error } = await query
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('time-entries GET error (dev fallback):', error)
        return jsonWithCors(request, { entries: [] })
      }
      return jsonWithCors(request, { error: 'Failed to fetch entries' }, 500)
    }

    // Map data to include joined fields
    const mappedEntries = (data || []).map(entry => ({
      ...entry,
      task_title: entry.task?.title,
      category_name: entry.category?.name,
      category_color: entry.category?.color,
    }))

    return jsonWithCors(request, { entries: mappedEntries })
  } catch (e) {
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    const client = createClientForRequest(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const body = await request.json()
    const parsed = TimeEntryCreateSchema.safeParse(body)
    if (!parsed.success) return jsonWithCors(request, { error: 'Invalid body', details: parsed.error.errors }, 400)

    const { start_at, end_at, note } = parsed.data

    // If end_at provided, validate ordering client-side too (DB also enforces)
    if (end_at && new Date(end_at) <= new Date(start_at)) {
      return jsonWithCors(request, { error: 'end_at must be after start_at' }, 400)
    }

    const { data, error } = await client
      .from('task_time_entries')
      .insert({
        user_id: userId,
        task_id: taskId,
        start_at,
        end_at: end_at || null,
        note: note || null,
        source: 'manual',
      })
      .select(`
        id, task_id, start_at, end_at, duration_minutes, note, source,
        task:tasks(title),
        category:categories(name, color)
      `)
      .single()
    if (error) return jsonWithCors(request, { error: 'Failed to create entry' }, 500)
    
    // Map entry to include joined fields
    const mappedEntry = {
      ...data,
      task_title: data.task?.title,
      category_name: data.category?.name,
      category_color: data.category?.color,
    }
    
    return jsonWithCors(request, { entry: mappedEntry }, 201)
  } catch (e) {
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}


