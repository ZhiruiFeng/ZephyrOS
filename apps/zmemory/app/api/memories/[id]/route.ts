import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth';
import { z } from 'zod';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Data validation schema
const MemoryUpdateSchema = z.object({
  type: z.string().optional(),
  content: z.any().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

// GET /api/memories/[id] - Get single memory
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const client = createClientForRequest(request) || supabase
    const { data, error } = await client
      .from('memories')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Memory not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch memory' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/memories/[id] - Update memory
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Validate input data
    const validatedData = MemoryUpdateSchema.parse(body);
    
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const client = createClientForRequest(request) || supabase
    const { data, error } = await client
      .from('memories')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Memory not found' },
          { status: 404 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update memory' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/memories/[id] - Delete memory
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const client = createClientForRequest(request) || supabase
    const { error } = await client
      .from('memories')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete memory' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 