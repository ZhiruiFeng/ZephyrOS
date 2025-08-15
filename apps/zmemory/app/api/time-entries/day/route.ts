import { NextRequest } from 'next/server'
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth'
import { supabase as serviceClient } from '../../../../lib/supabase'
import { createOptionsResponse, jsonWithCors } from '../../../../lib/security'

// Query user's time entries across all tasks within a time window (day view)
// Query params: from (iso), to (iso)
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        return jsonWithCors(request, { entries: [] })
      }
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }
    const client = createClientForRequest(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const sp = new URL(request.url).searchParams
    const from = sp.get('from') || ''
    const to = sp.get('to') || ''
    if (!from || !to) return jsonWithCors(request, { error: 'from/to required' }, 400)

    // Fetch entries that overlap [from, to]
    // start_at < to AND coalesce(end_at, now()) >= from
    const { data, error } = await client
      .from('task_time_entries')
      .select(`
        id,
        task_id,
        start_at,
        end_at,
        duration_minutes,
        note,
        source,
        category_id_snapshot,
        task:tasks(title),
        category:categories(id, name, color)
      `)
      .eq('user_id', userId)
      .lt('start_at', to)
      .gte('end_at', from)
      .order('start_at', { ascending: true })

    if (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('day entries error (dev fallback):', error)
        return jsonWithCors(request, { entries: [] })
      }
      return jsonWithCors(request, { error: 'Failed to fetch day entries' }, 500)
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

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}


