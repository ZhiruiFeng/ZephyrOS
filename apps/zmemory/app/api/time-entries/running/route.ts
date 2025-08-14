import { NextRequest } from 'next/server'
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth'
import { supabase as serviceClient } from '../../../../lib/supabase'
import { createOptionsResponse, jsonWithCors } from '../../../../lib/security'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    const client = createClientForRequest(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const { data, error } = await client
      .from('task_time_entries')
      .select('id, task_id, start_at')
      .eq('user_id', userId)
      .is('end_at', null)
      .maybeSingle()
    if (error) return jsonWithCors(request, { error: 'Failed to fetch running timer' }, 500)
    return jsonWithCors(request, { entry: data || null })
  } catch (e) {
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}


