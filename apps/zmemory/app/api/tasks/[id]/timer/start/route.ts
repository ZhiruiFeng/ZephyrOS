import { NextRequest } from 'next/server'
import { createClientForRequest, getUserIdFromRequest } from '@/auth'
import { supabase as serviceClient } from '../../../../../../lib/supabase'
import { TimerStartSchema } from '@/validation'
import { createOptionsResponse, isRateLimited, getClientIP, jsonWithCors } from '@/lib/security'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = await params
  try {
    const clientIP = getClientIP(request)
    if (isRateLimited(clientIP, 60_000, 30)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401)

    const client = createClientForRequest(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const body = await request.json().catch(() => ({}))
    const parsed = TimerStartSchema.safeParse(body || {})
    if (!parsed.success) {
      return jsonWithCors(request, { error: 'Invalid request', details: parsed.error.errors }, 400)
    }

    const { autoSwitch } = parsed.data

    // Ensure task belongs to user
    const { data: taskRow, error: taskErr } = await client
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()
    if (taskErr || !taskRow) return jsonWithCors(request, { error: 'Task not found' }, 404)

    // Check existing running entry
    const { data: running, error: runningErr } = await client
      .from('time_entries')
      .select('id, timeline_item_id, timeline_item_type, start_at')
      .eq('user_id', userId)
      .is('end_at', null)
      .maybeSingle()
    if (runningErr) return jsonWithCors(request, { error: 'Failed to check running timer' }, 500)

    if (running && running.timeline_item_id === taskId) {
      // Already running on this task: idempotent
      const responseData = {
        ...running,
        task_id: running.timeline_item_id, // Add backward compatibility
      };
      return jsonWithCors(request, { entry: responseData })
    }

    if (running && !autoSwitch) {
      return jsonWithCors(request, { error: 'Another timer is running', running }, 409)
    }

    // If autoSwitch and there is a running entry, stop it first
    if (running && autoSwitch) {
      const { error: stopErr } = await client
        .from('time_entries')
        .update({ end_at: new Date().toISOString() })
        .eq('id', running.id)
        .eq('user_id', userId)
      if (stopErr) return jsonWithCors(request, { error: 'Failed to stop current timer' }, 500)
    }

    // Start new entry
    const payload = {
      user_id: userId,
      timeline_item_id: taskId,
      start_at: new Date().toISOString(),
      source: 'timer' as const,
    }
    const { data: inserted, error: insertErr } = await client
      .from('time_entries')
      .insert(payload)
      .select('id, timeline_item_id, timeline_item_type, start_at')
      .single()
    if (insertErr) {
      // Unique constraint may fail if race: surface 409
      if ((insertErr as any).code === '23505') {
        return jsonWithCors(request, { error: 'Another timer is running' }, 409)
      }
      return jsonWithCors(request, { error: 'Failed to start timer' }, 500)
    }

    // Add backward compatibility field for frontend
    const responseData = {
      ...inserted,
      task_id: inserted.timeline_item_id, // For task timers, timeline_item_id is the task_id
    };
    
    return jsonWithCors(request, { entry: responseData }, 201)
  } catch (e) {
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}


