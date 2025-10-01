import { NextRequest } from 'next/server'
import { getClientForAuthType, getUserIdFromRequest } from '@/auth'
import { supabase as serviceClient } from '@/lib/supabase'
import { TimeEntriesQuerySchema, TimeEntryCreateSchema } from '@/validation'
import { createOptionsResponse, jsonWithCors } from '@/lib/security'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        // Dev fallback: allow UI to work without auth
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
      .eq('timeline_item_id', activityId)
      .eq('timeline_item_type', 'activity')
      .order('start_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (from) query = query.gte('start_at', from)
    if (to) query = query.lte('start_at', to)

    const { data, error } = await query
    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('activity time-entries GET error (dev fallback):', error)
        return jsonWithCors(request, { entries: [] })
      }
      return jsonWithCors(request, { error: 'Failed to fetch entries' }, 500)
    }

    // Map to include activity_id for backward compatibility
    const entries = (data || []).map(entry => ({
      ...entry,
      activity_id: entry.timeline_item_id, // For backward compatibility
    }))

    return jsonWithCors(request, { entries })
  } catch (error) {
    console.error('GET activity time-entries error:', error)
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }
    const client = await getClientForAuthType(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const body = await request.json()
    const parsed = TimeEntryCreateSchema.safeParse(body)
    if (!parsed.success) {
      return jsonWithCors(request, { error: 'Invalid request body', details: parsed.error.errors }, 400)
    }

    // Verify the activity exists and belongs to the user
    const { data: activity } = await client
      .from('activities')
      .select('id, title')
      .eq('id', activityId)
      .eq('user_id', userId)
      .single()

    if (!activity) {
      return jsonWithCors(request, { error: 'Activity not found' }, 404)
    }

    // If this is a timer source and no end_at is provided (starting a timer), 
    // check for running timers and stop them first
    if (parsed.data.source === 'timer' && !parsed.data.end_at) {
      const { data: running, error: runningErr } = await client
        .from('time_entries')
        .select('id, timeline_item_id, timeline_item_type')
        .eq('user_id', userId)
        .is('end_at', null)
        .maybeSingle()

      if (runningErr) {
        return jsonWithCors(request, { error: 'Failed to check running timer' }, 500)
      }

      // If there's a running timer, stop it first
      if (running) {
        const { error: stopErr } = await client
          .from('time_entries')
          .update({ end_at: new Date().toISOString() })
          .eq('id', running.id)
          .eq('user_id', userId)
        
        if (stopErr) {
          return jsonWithCors(request, { error: 'Failed to stop current timer' }, 500)
        }
      }
    }

    const timeEntryData = {
      ...parsed.data,
      timeline_item_id: activityId,
      user_id: userId,
      source: parsed.data.source || 'manual'
    }

    const { data, error } = await client
      .from('time_entries')
      .insert(timeEntryData)
      .select(`
        id, timeline_item_id, timeline_item_type, timeline_item_title,
        start_at, end_at, duration_minutes, note, source,
        category_id_snapshot,
        timeline_item:timeline_items(title, type),
        category:categories(name, color)
      `)
      .single()

    if (error) {
      console.error('POST activity time-entries error:', error)
      return jsonWithCors(request, { error: 'Failed to create time entry' }, 500)
    }

    // Add activity_id for backward compatibility
    const result = {
      ...data,
      activity_id: data.timeline_item_id,
    }

    return jsonWithCors(request, result, 201)
  } catch (error) {
    console.error('POST activity time-entries error:', error)
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}
