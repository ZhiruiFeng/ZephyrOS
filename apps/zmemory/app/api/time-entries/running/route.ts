import { NextRequest } from 'next/server'
import { createClientForRequest, getUserIdFromRequest } from '@/auth'
import { supabase as serviceClient } from '@/lib/supabase'
import { createOptionsResponse, jsonWithCors } from '@/lib/security'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    const client = createClientForRequest(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const { data, error } = await client
      .from('time_entries')
      .select('id, timeline_item_id, timeline_item_type, start_at')
      .eq('user_id', userId)
      .is('end_at', null)
      .maybeSingle()
    if (error) return jsonWithCors(request, { error: 'Failed to fetch running timer' }, 500)
    
    // Add backward compatibility field for frontend
    const responseData = data ? {
      ...data,
      // For backward compatibility, expose task_id if it's a task
      task_id: data.timeline_item_type === 'task' ? data.timeline_item_id : undefined,
    } : null;
    
    return jsonWithCors(request, { entry: responseData })
  } catch (e) {
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}


