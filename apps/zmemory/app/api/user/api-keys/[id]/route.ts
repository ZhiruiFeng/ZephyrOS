import { NextRequest } from 'next/server'
import { getAuthContext } from '@/auth'
import { jsonWithCors, createOptionsResponse, sanitizeErrorMessage } from '@/lib/security'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const updateApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  is_active: z.boolean().optional(),
  scopes: z.array(z.string()).optional()
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await getAuthContext(request);
    // Only allow OAuth-authenticated users to update keys
    if (!auth || auth.authType !== 'oauth') {
      return jsonWithCors(request, { error: 'Unauthorized', success: false }, 401);
    }

    const body = await request.json();
    const validation = updateApiKeySchema.safeParse(body);
    if (!validation.success) {
      return jsonWithCors(request, {
        error: 'Invalid request data',
        details: validation.error.errors,
        success: false
      }, 400);
    }

    const updates = validation.data;
    if (Object.keys(updates).length === 0) {
      return jsonWithCors(request, {
        error: 'No updates provided',
        success: false
      }, 400);
    }

    const { data, error } = await supabase
      .from('zmemory_api_keys')
      .update(updates)
      .eq('id', id)
      .eq('user_id', auth.id)
      .select('id, name, key_preview, scopes, is_active, last_used_at, expires_at, created_at')
      .single();

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }

    if (!data) {
      return jsonWithCors(request, {
        error: 'API key not found',
        success: false
      }, 404);
    }

    return jsonWithCors(request, {
      data,
      success: true
    });
  } catch (error) {
    console.error('Error updating ZMemory API key:', error);
    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to update API key'),
      success: false
    }, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await getAuthContext(request);
    // Only allow OAuth-authenticated users to delete keys
    if (!auth || auth.authType !== 'oauth') {
      return jsonWithCors(request, { error: 'Unauthorized', success: false }, 401);
    }

    const { error } = await supabase
      .from('zmemory_api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.id);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }

    return jsonWithCors(request, {
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ZMemory API key:', error);
    return jsonWithCors(request, {
      error: sanitizeErrorMessage(error, 'Failed to delete API key'),
      success: false
    }, 500);
  }
}