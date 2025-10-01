import { NextRequest } from 'next/server'
import { getClientForAuthType, getUserIdFromRequest, addUserIdIfNeeded } from '@/auth'
import { supabase as serviceClient } from '@/lib/supabase'
import { TimeEntriesQuerySchema, TimeEntryCreateSchema } from '@/validation'
import { createOptionsResponse, jsonWithCors } from '@/lib/security'

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
    const client = await getClientForAuthType(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const searchParams = new URL(request.url).searchParams
    const parsed = TimeEntriesQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!parsed.success) return jsonWithCors(request, { error: 'Invalid query', details: parsed.error.errors }, 400)
    const { from, to, limit, offset } = parsed.data

    let query = client
      .from('time_entries')
      .select(`
        id, timeline_item_id, timeline_item_type, timeline_item_title,
        start_at, end_at, duration_minutes, note, source,
        category_id_snapshot,
        timeline_item:timeline_items(title, type),
        category:categories(name, color)
      `)
      .eq('user_id', userId)
      .eq('timeline_item_id', taskId)
      .eq('timeline_item_type', 'task')
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
    const mappedEntries = (data || []).map((entry: any) => {
      const timeline_item = Array.isArray(entry.timeline_item) ? entry.timeline_item[0] : entry.timeline_item
      const category = Array.isArray(entry.category) ? entry.category[0] : entry.category
      return {
        ...entry,
        task_title: entry.timeline_item_title || timeline_item?.title,
        category_name: category?.name,
        category_color: category?.color,
        // Keep task_id for backward compatibility
        task_id: entry.timeline_item_id,
      }
    })

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
    const client = await getClientForAuthType(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const body = await request.json()
    const parsed = TimeEntryCreateSchema.safeParse(body)
    if (!parsed.success) return jsonWithCors(request, { error: 'Invalid body', details: parsed.error.errors }, 400)

    const { start_at, end_at, note } = parsed.data

    // Ensure start_at is available (should be guaranteed by validation)
    if (!start_at) {
      return jsonWithCors(request, { error: 'start_at is required' }, 400)
    }

    // If end_at provided, validate ordering client-side too (DB also enforces)
    if (end_at && new Date(end_at) <= new Date(start_at)) {
      return jsonWithCors(request, { error: 'end_at must be after start_at' }, 400)
    }

    const entryPayload = {
      timeline_item_id: taskId,
      start_at,
      end_at: end_at || null,
      note: note || null,
      source: 'manual',
    };

    // Add user_id to payload (always needed since we use service role client)
    await addUserIdIfNeeded(entryPayload, userId, request);

    const { data, error } = await client
      .from('time_entries')
      .insert(entryPayload)
      .select(`
        id, timeline_item_id, timeline_item_type, timeline_item_title,
        start_at, end_at, duration_minutes, note, source,
        category_id_snapshot,
        timeline_item:timeline_items(title, type),
        category:categories(name, color)
      `)
      .single()
    if (error) return jsonWithCors(request, { error: 'Failed to create entry' }, 500)
    
    // Map entry to include joined fields
    const timeline_item = Array.isArray(data.timeline_item) ? data.timeline_item[0] : data.timeline_item
    const category = Array.isArray(data.category) ? data.category[0] : data.category
    const mappedEntry = {
      ...data,
      task_title: data.timeline_item_title || timeline_item?.title,
      category_name: category?.name,
      category_color: category?.color,
      // Keep task_id for backward compatibility
      task_id: data.timeline_item_id,
    }
    
    return jsonWithCors(request, { entry: mappedEntry }, 201)
  } catch (e) {
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}


