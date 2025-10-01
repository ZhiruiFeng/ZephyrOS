import { NextRequest } from 'next/server'
import { getClientForAuthType, getUserIdFromRequest } from '@/auth'
import { supabase as serviceClient } from '../../../../../../lib/supabase'
import { TimerStopSchema } from '@/validation'
import { createOptionsResponse, isRateLimited, getClientIP, jsonWithCors } from '@/lib/security'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params
  try {
    const clientIP = getClientIP(request)
    if (isRateLimited(clientIP, 60_000, 60)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401)

    const client = await getClientForAuthType(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const body = await request.json().catch(() => ({}))
    const parsed = TimerStopSchema.safeParse(body || {})
    if (!parsed.success) {
      return jsonWithCors(request, { error: 'Invalid request', details: parsed.error.errors }, 400)
    }

    const overrideEndAt = parsed.data.overrideEndAt
    const endAt = overrideEndAt ? new Date(overrideEndAt).toISOString() : new Date().toISOString()

    // Find running entry for this user (optionally verify task id)
    const { data: running, error: runningErr } = await client
      .from('time_entries')
      .select('id, timeline_item_id, timeline_item_type, start_at')
      .eq('user_id', userId)
      .is('end_at', null)
      .maybeSingle()
    if (runningErr) return jsonWithCors(request, { error: 'Failed to fetch running entry' }, 500)
    if (!running) {
      // Idempotent: nothing running
      return jsonWithCors(request, { entry: null })
    }
    if (running.timeline_item_id !== taskId) {
      // Allow stop via specific task endpoint only for its running entry
      return jsonWithCors(request, { error: 'No running timer for this task' }, 404)
    }

    // Basic validation when override provided: endAt must be <= now and > start_at
    if (overrideEndAt) {
      const nowIso = new Date().toISOString()
      if (endAt > nowIso) {
        return jsonWithCors(request, { error: 'End time cannot be in the future' }, 400)
      }
      if (endAt <= running.start_at) {
        return jsonWithCors(request, { error: 'End time must be after start time' }, 400)
      }
    }

    const { data: updated, error: updateErr } = await client
      .from('time_entries')
      .update({ end_at: endAt })
      .eq('id', running.id)
      .eq('user_id', userId)
      .select('id, timeline_item_id, timeline_item_type, start_at, end_at, duration_minutes')
      .single()
    if (updateErr) return jsonWithCors(request, { error: 'Failed to stop timer' }, 500)

    // Add backward compatibility field for frontend
    const responseData = {
      ...updated,
      task_id: updated.timeline_item_id, // For task timers, timeline_item_id is the task_id
    };
    
    return jsonWithCors(request, { entry: responseData })
  } catch (e) {
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}


