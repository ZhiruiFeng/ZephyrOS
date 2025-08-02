import { NextResponse } from 'next/server';

// GET /api/health - 健康检查端点
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'zmemory-api',
    version: '1.0.0',
  });
} 