import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// 验证schema
const CreateCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称过长'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, '颜色格式不正确').default('#6B7280'),
  icon: z.string().optional()
});

const UpdateCategorySchema = CreateCategorySchema.partial();

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

// GET /api/categories - 获取所有分类
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      // Return mock data when Supabase is not configured
      const mockCategories = [
        { id: '1', name: 'Work', description: 'Work related tasks', color: '#3B82F6', icon: 'briefcase' },
        { id: '2', name: 'Personal', description: 'Personal tasks', color: '#10B981', icon: 'user' },
        { id: '3', name: 'Learning', description: 'Learning and development', color: '#F59E0B', icon: 'book' }
      ];
      return jsonWithCors(request, { categories: mockCategories });
    }

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('获取分类失败:', error);
      return jsonWithCors(request, { error: '获取分类失败' }, 500);
    }

    return jsonWithCors(request, { categories });
  } catch (error) {
    console.error('获取分类时发生错误:', error);
    return jsonWithCors(request, { error: '服务器内部错误' }, 500);
  }
}

// POST /api/categories - 创建新分类
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      // Return mock response when Supabase is not configured
      const body = await request.json();
      const validatedData = CreateCategorySchema.parse(body);
      const mockCategory = {
        id: Date.now().toString(),
        ...validatedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      return jsonWithCors(request, { category: mockCategory }, 201);
    }

    const body = await request.json();
    const validatedData = CreateCategorySchema.parse(body);

    const { data: category, error } = await supabase
      .from('categories')
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // 唯一约束违反
        return jsonWithCors(request, { error: '分类名称已存在' }, 400);
      }
      console.error('创建分类失败:', error);
      return jsonWithCors(request, { error: '创建分类失败' }, 500);
    }

    return jsonWithCors(request, { category }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithCors(request, { error: '数据验证失败', details: error.errors }, 400);
    }
    console.error('创建分类时发生错误:', error);
    return jsonWithCors(request, { error: '服务器内部错误' }, 500);
  }
}
