import { NextRequest, NextResponse } from 'next/server';
function jsonWithCors(request: NextRequest, body: any, status = 200) {
  const origin = request.headers.get('origin') || '*';
  const res = NextResponse.json(body, { status });
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
import { createClientForRequest, getUserIdFromRequest } from '../../../lib/auth';
import { z } from 'zod';

// 验证schema
const CreateTaskRelationSchema = z.object({
  parent_task_id: z.string().uuid('父任务ID格式不正确'),
  child_task_id: z.string().uuid('子任务ID格式不正确'),
  relation_type: z.enum(['subtask', 'related', 'dependency', 'blocked_by'], {
    errorMap: () => ({ message: '关系类型不正确' })
  })
});

// GET /api/task-relations - 获取任务关系
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    const supabase = createClientForRequest(request)

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    const relationType = searchParams.get('relation_type');

    let query = supabase!
      .from('task_relations')
      .select(`
        *,
        parent_task:tasks!parent_task_id(id, title, status, priority),
        child_task:tasks!child_task_id(id, title, status, priority)
      `)
      .eq('user_id', userId);

    if (taskId) {
      query = query.or(`parent_task_id.eq.${taskId},child_task_id.eq.${taskId}`);
    }

    if (relationType) {
      query = query.eq('relation_type', relationType);
    }

    const { data: relations, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('获取任务关系失败:', error);
      return jsonWithCors(request, { error: '获取任务关系失败' }, 500);
    }

    return jsonWithCors(request, { relations });
  } catch (error) {
    console.error('获取任务关系时发生错误:', error);
    return jsonWithCors(request, { error: '服务器内部错误' }, 500);
  }
}

// POST /api/task-relations - 创建任务关系
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    const supabase = createClientForRequest(request)!

    const body = await request.json();
    const validatedData = CreateTaskRelationSchema.parse(body);

    // 检查任务是否存在且属于当前用户
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id')
      .in('id', [validatedData.parent_task_id, validatedData.child_task_id])
      .eq('user_id', userId);

    if (tasksError) {
      console.error('检查任务存在性失败:', tasksError);
      return NextResponse.json({ error: '检查任务存在性失败' }, { status: 500 });
    }

    if (!tasks || tasks.length !== 2) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 检查是否已存在相同关系
    const { data: existingRelation, error: checkError } = await supabase
      .from('task_relations')
      .select('id')
      .eq('parent_task_id', validatedData.parent_task_id)
      .eq('child_task_id', validatedData.child_task_id)
      .eq('relation_type', validatedData.relation_type)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('检查关系存在性失败:', checkError);
      return NextResponse.json({ error: '检查关系存在性失败' }, { status: 500 });
    }

    if (existingRelation) {
      return NextResponse.json({ error: '任务关系已存在' }, { status: 400 });
    }

    const { data: relation, error } = await supabase
      .from('task_relations')
      .insert({
        ...validatedData,
        user_id: userId
      })
      .select(`
        *,
        parent_task:tasks!parent_task_id(id, title, status, priority),
        child_task:tasks!child_task_id(id, title, status, priority)
      `)
      .single();

    if (error) {
      console.error('创建任务关系失败:', error);
      return jsonWithCors(request, { error: '创建任务关系失败' }, 500);
    }

    return jsonWithCors(request, { relation }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonWithCors(request, { error: '数据验证失败', details: error.errors }, 400);
    }
    console.error('创建任务关系时发生错误:', error);
    return jsonWithCors(request, { error: '服务器内部错误' }, 500);
  }
}
