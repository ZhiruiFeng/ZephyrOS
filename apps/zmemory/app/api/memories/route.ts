import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check environment variables
if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables. API will return mock data.');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Data validation schema
const MemorySchema = z.object({
  type: z.string(),
  content: z.any(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const MemoryUpdateSchema = MemorySchema.partial();

// GET /api/memories - Get memories list
export async function GET(request: NextRequest) {
  try {
    // If Supabase is not configured, return mock data
    if (!supabase) {
      return NextResponse.json([
        {
          id: '1',
          type: 'task',
          content: {
            title: 'Sample Task',
            description: 'This is a sample task',
            status: 'pending',
            priority: 'medium'
          },
          tags: ['zflow', 'task'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    let query = supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
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

// POST /api/memories - Create new memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // If Supabase is not configured, return mock response
    if (!supabase) {
      const mockMemory = {
        id: Date.now().toString(),
        type: body.type,
        content: body.content,
        tags: body.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return NextResponse.json(mockMemory, { status: 201 });
    }

    const { data, error } = await supabase
      .from('memories')
      .insert({
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create memory' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
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