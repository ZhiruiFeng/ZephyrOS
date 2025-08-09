import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function jsonWithCors(request: NextRequest, body: any, status = 200) {
  const origin = request.headers.get('origin') || '*';
  const res = NextResponse.json(body, { status });
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// 验证schema
const UpdateCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称过长').optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, '颜色格式不正确').optional(),
  icon: z.string().optional()
});

// GET /api/categories/[id] - 获取单个分类
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!supabase) {
      const mockCategory = {
        id: '1',
        name: 'Work',
        description: 'Work related tasks',
        color: '#3B82F6',
        icon: 'briefcase'
      };
      return jsonWithCors(request, { category: id === '1' ? mockCategory : null });
    }

    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: '分类不存在' }, 404);
      }
      console.error('获取分类失败:', error);
      return jsonWithCors(request, { error: '获取分类失败' }, 500);
    }

    return jsonWithCors(request, { category });
  } catch (error) {
    console.error('获取分类时发生错误:', error);
    return jsonWithCors(request, { error: '服务器内部错误' }, 500);
  }
}

// PUT /api/categories/[id] - 更新分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!supabase) {
      const validatedData = UpdateCategorySchema.parse(body);
      const mockCategory = {
        id,
        ...validatedData,
        updated_at: new Date().toISOString()
      };
      return jsonWithCors(request, { category: mockCategory });
    }

    const validatedData = UpdateCategorySchema.parse(body);

    const { data: category, error } = await supabase
      .from('categories')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: '分类不存在' }, 404);
      }
      if (error.code === '23505') { // 唯一约束违反
        return jsonWithCors(request, { error: '分类名称已存在' }, 400);
      }
      console.error('更新分类失败:', error);
      return jsonWithCors(request, { error: '更新分类失败' }, 500);
    }

    return jsonWithCors(request, { category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithCors(request, { error: '数据验证失败', details: error.errors }, 400);
    }
    console.error('更新分类时发生错误:', error);
    return jsonWithCors(request, { error: '服务器内部错误' }, 500);
  }
}

// DELETE /api/categories/[id] - 删除分类
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!supabase) {
      return jsonWithCors(request, { message: '分类删除成功' });
    }

    // 检查是否有任务使用此分类
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (tasksError) {
      console.error('检查分类使用情况失败:', tasksError);
      return jsonWithCors(request, { error: '检查分类使用情况失败' }, 500);
    }

    if (tasks && tasks.length > 0) {
      return jsonWithCors(request, { error: '无法删除正在使用的分类' }, 400);
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: '分类不存在' }, 404);
      }
      console.error('删除分类失败:', error);
      return jsonWithCors(request, { error: '删除分类失败' }, 500);
    }

    return jsonWithCors(request, { message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类时发生错误:', error);
    return jsonWithCors(request, { error: '服务器内部错误' }, 500);
  }
}
