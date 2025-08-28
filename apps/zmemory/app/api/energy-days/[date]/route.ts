import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../../lib/security';

function getSupabaseClient(request: NextRequest) {
  return createClientForRequest(request) || (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    : null);
}

// GET /api/energy-days/[date]
export async function GET(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401);

    const client = getSupabaseClient(request);
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500);

    const { date } = await params

    const { data, error } = await client
      .from('energy_day')
      .select('*')
      .eq('user_id', userId)
      .eq('local_date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      return jsonWithCors(request, { error: 'Failed to fetch energy day' }, 500);
    }
    return jsonWithCors(request, data || null);
  } catch (err) {
    return jsonWithCors(request, { error: sanitizeErrorMessage(err) }, 500);
  }
}

// PUT /api/energy-days/[date] -> upsert full day
export async function PUT(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 100)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401);

    const client = getSupabaseClient(request);
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500);

    const body = await request.json();
    const { date } = await params
    const payload = {
      user_id: userId,
      local_date: date,
      tz: body.tz,
      curve: body.curve,
      source: body.source,
      edited_mask: body.edited_mask,
      last_checked_index: body.last_checked_index,
      last_checked_at: body.last_checked_at,
      metadata: body.metadata,
    };

    const { data, error } = await client
      .from('energy_day')
      .upsert(payload, { onConflict: 'user_id,local_date' })
      .select('*')
      .single();

    if (error) return jsonWithCors(request, { error: 'Failed to upsert energy day' }, 500);
    return jsonWithCors(request, data, 201);
  } catch (err) {
    return jsonWithCors(request, { error: sanitizeErrorMessage(err) }, 500);
  }
}

// PATCH /api/energy-days/[date] -> partial update
// body 可以包含任意一个或多个字段：
//   curve, edited_mask, last_checked_index, last_checked_at, tz, source, metadata
// 也支持 { op: 'set_segment', index: number, value: number } 用于单段更新
// 或 { op: 'set_mask', index: number, value: boolean }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 200)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401);

    const client = getSupabaseClient(request);
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500);

    const body = await request.json();
    const { date } = await params

    // Segment update op: use Postgres array update with single query
    if (body?.op === 'set_segment') {
      const idx = Number(body.index);
      const val = Number(body.value);
      if (!Number.isInteger(idx) || idx < 0 || idx > 71) {
        return jsonWithCors(request, { error: 'index out of range (0..71)' }, 400);
      }
      
      // Use PostgreSQL array update syntax for atomic operation
      // Note: PostgreSQL arrays are 1-based, so we add 1 to the index
      const { data, error } = await client.rpc('update_energy_segment', {
        p_user_id: userId,
        p_local_date: date,
        p_index: idx + 1, // Convert to 1-based index for PostgreSQL
        p_value: val
      });
      
      if (error) return jsonWithCors(request, { error: 'Failed to update segment' }, 500);
      return jsonWithCors(request, data);
    }

    if (body?.op === 'set_mask') {
      const idx = Number(body.index);
      const val = Boolean(body.value);
      if (!Number.isInteger(idx) || idx < 0 || idx > 71) {
        return jsonWithCors(request, { error: 'index out of range (0..71)' }, 400);
      }
      const { data, error } = await client
        .from('energy_day')
        .update({})
        .eq('user_id', userId)
        .eq('local_date', date)
        .select('*')
        .single();
      if (error) return jsonWithCors(request, { error: 'Failed to load energy day' }, 500);
      const edited_mask = (data?.edited_mask || new Array(72).fill(false)) as boolean[];
      edited_mask[idx] = val;
      const { data: updated, error: uerr } = await client
        .from('energy_day')
        .update({ edited_mask })
        .eq('user_id', userId)
        .eq('local_date', date)
        .select('*')
        .single();
      if (uerr) return jsonWithCors(request, { error: 'Failed to update mask' }, 500);
      return jsonWithCors(request, updated);
    }

    // Generic partial update: only include provided fields
    const updatePayload: any = {};
    for (const key of ['curve','edited_mask','last_checked_index','last_checked_at','tz','source','metadata']) {
      if (Object.prototype.hasOwnProperty.call(body, key)) updatePayload[key] = body[key];
    }
    if (Object.keys(updatePayload).length === 0) {
      return jsonWithCors(request, { error: 'No updatable fields provided' }, 400);
    }

    const { data, error } = await client
      .from('energy_day')
      .update(updatePayload)
      .eq('user_id', userId)
      .eq('local_date', date)
      .select('*')
      .single();
    if (error) return jsonWithCors(request, { error: 'Failed to update energy day' }, 500);
    return jsonWithCors(request, data);
  } catch (err) {
    return jsonWithCors(request, { error: sanitizeErrorMessage(err) }, 500);
  }
}

// DELETE /api/energy-days/[date]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 60 * 1000, 30)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }
    const userId = await getUserIdFromRequest(request);
    if (!userId) return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    const client = getSupabaseClient(request);
    if (!client) return jsonWithCors(request, { error: 'Supabase not configured' }, 500);

    const { date } = await params

    const { error } = await client
      .from('energy_day')
      .delete()
      .eq('user_id', userId)
      .eq('local_date', date);
    if (error) return jsonWithCors(request, { error: 'Failed to delete energy day' }, 500);
    return jsonWithCors(request, { success: true });
  } catch (err) {
    return jsonWithCors(request, { error: sanitizeErrorMessage(err) }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}


