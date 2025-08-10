import { NextRequest, NextResponse } from 'next/server';
import { createClientForRequest, getUserIdFromRequest } from '../../../../lib/auth';
function jsonWithCors(request: NextRequest, body: any, status = 200) {
  const origin = request.headers.get('origin') || '*';
  const res = NextResponse.json(body, { status });
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
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
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// DELETE /api/task-relations/[id] - 删除任务关系
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    const supabase = createClientForRequest(request)!

    const { error } = await supabase
      .from('task_relations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonWithCors(request, { error: '任务关系不存在' }, 404);
      }
      console.error('删除任务关系失败:', error);
      return jsonWithCors(request, { error: '删除任务关系失败' }, 500);
    }

    return jsonWithCors(request, { message: '任务关系删除成功' });
  } catch (error) {
    console.error('删除任务关系时发生错误:', error);
    return jsonWithCors(request, { error: '服务器内部错误' }, 500);
  }
}
