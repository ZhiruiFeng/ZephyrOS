import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// 创建 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 检查环境变量
if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables. API will return mock data.');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// 数据验证模式
const MemorySchema = z.object({
  type: z.string(),
  content: z.any(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const MemoryUpdateSchema = MemorySchema.partial();

// GET /api/memories - 获取记忆列表
export async function GET(request: NextRequest) {
  try {
    // 如果没有配置 Supabase，返回模拟数据
    if (!supabase) {
      return NextResponse.json([
        {
          id: '1',
          type: 'task',
          content: {
            title: '示例任务',
            description: '这是一个示例任务',
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

// POST /api/memories - 创建新记忆
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 如果没有配置 Supabase，返回模拟响应
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

// OPTIONS - 处理 CORS 预检请求
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