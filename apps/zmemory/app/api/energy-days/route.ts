import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../lib/auth';
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage, isRateLimited, getClientIP } from '../../../lib/security';

// GET /api/energy-days?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : null);
    if (!client) {
      return jsonWithCors(request, []);
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limit = Math.min(parseInt(searchParams.get('limit') || '90', 10), 365);

    let query = client
      .from('energy_day')
      .select('*')
      .eq('user_id', userId)
      .order('local_date', { ascending: true })
      .limit(limit);

    if (start) query = query.gte('local_date', start);
    if (end) query = query.lte('local_date', end);

    const { data, error } = await query;
    if (error) {
      return jsonWithCors(request, { error: 'Failed to fetch energy days' }, 500);
    }
    return jsonWithCors(request, data || []);
  } catch (err) {
    return jsonWithCors(request, { error: sanitizeErrorMessage(err) }, 500);
  }
}

// POST /api/energy-days  -> upsert a day curve
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    if (isRateLimited(clientIP, 15 * 60 * 1000, 100)) {
      return jsonWithCors(request, { error: 'Too many requests' }, 429);
    }

    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401);
    }

    const client = createClientForRequest(request) || (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : null);
    if (!client) {
      return jsonWithCors(request, { error: 'Supabase not configured' }, 500);
    }

    const body = await request.json();
    // Build payload without introducing nulls to NOT NULL columns
    const payload: any = {
      user_id: userId,
      local_date: body.local_date,
      tz: body.tz || 'America/Los_Angeles',
      curve: body.curve,
      source: body.source || 'user_edited',
    };
    if (Array.isArray(body.edited_mask)) payload.edited_mask = body.edited_mask;
    if (body.last_checked_index !== undefined) payload.last_checked_index = body.last_checked_index;
    if (body.last_checked_at !== undefined) payload.last_checked_at = body.last_checked_at;

    const { data, error } = await client
      .from('energy_day')
      .upsert(payload, { onConflict: 'user_id,local_date' })
      .select('*')
      .single();

    if (error) {
      return jsonWithCors(request, { error: 'Failed to upsert energy day' }, 500);
    }
    return jsonWithCors(request, data, 201);
  } catch (err) {
    return jsonWithCors(request, { error: sanitizeErrorMessage(err) }, 500);
  }
}

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}


