import { NextRequest } from 'next/server'
import { getClientForAuthType, getUserIdFromRequest } from '@/auth'
import { supabase as serviceClient } from '@/lib/supabase'
import { TimeEntryUpdateSchema } from '@/validation'
import { createOptionsResponse, jsonWithCors } from '@/lib/security'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    const client = await getClientForAuthType(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const body = await request.json()
    const parsed = TimeEntryUpdateSchema.safeParse(body)
    if (!parsed.success) return jsonWithCors(request, { error: 'Invalid body', details: parsed.error.errors }, 400)

    const updates: any = {}
    if (parsed.data.start_at !== undefined) updates.start_at = parsed.data.start_at
    if (parsed.data.end_at !== undefined) updates.end_at = parsed.data.end_at
    if (parsed.data.note !== undefined) updates.note = parsed.data.note

    // Basic local validation when both provided
    if (updates.start_at && updates.end_at && new Date(updates.end_at) <= new Date(updates.start_at)) {
      return jsonWithCors(request, { error: 'end_at must be after start_at' }, 400)
    }

    const { data, error } = await client
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, timeline_item_id, timeline_item_type, start_at, end_at, duration_minutes, note, source')
      .single()
    if (error) return jsonWithCors(request, { error: 'Failed to update entry' }, 500)
    return jsonWithCors(request, { entry: data })
  } catch (e) {
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    const client = await getClientForAuthType(request) || serviceClient
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500)

    const { error } = await client
      .from('time_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) return jsonWithCors(request, { error: 'Failed to delete entry' }, 500)
    return jsonWithCors(request, { success: true })
  } catch (e) {
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}


