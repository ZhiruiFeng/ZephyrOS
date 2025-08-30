import { NextRequest, NextResponse } from 'next/server';
import { ZMemoryMCPServer } from '../dist/server.js';
import { ZMemoryConfig } from '../dist/types.js';

// 配置CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 处理预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// MCP HTTP端点
export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    
    // 验证JSON-RPC格式
    if (!body.jsonrpc || body.jsonrpc !== '2.0') {
      return NextResponse.json(
        { 
          jsonrpc: '2.0', 
          error: { code: -32600, message: 'Invalid Request' },
          id: body.id || null 
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // 从环境变量获取配置
    const config: ZMemoryConfig = {
      apiUrl: process.env.ZMEMORY_API_URL || 'http://localhost:3001',
      apiKey: process.env.ZMEMORY_API_KEY,
      timeout: process.env.ZMEMORY_TIMEOUT ? parseInt(process.env.ZMEMORY_TIMEOUT) : 10000,
      oauth: {
        clientId: process.env.OAUTH_CLIENT_ID || 'zmemory-mcp',
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/callback',
        scope: process.env.OAUTH_SCOPE || 'tasks.write',
      },
    };

    // 创建MCP服务器实例
    const mcpServer = new ZMemoryMCPServer(config);
    
    // 处理不同的MCP方法
    let response;
    
    switch (body.method) {
      case 'initialize':
        response = await mcpServer.handleInitialize(body.params || {});
        break;
        
      case 'tools/list':
        response = await mcpServer.handleListTools();
        break;
        
      case 'tools/call':
        if (!body.params?.name) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              error: { code: -32602, message: 'Invalid params: missing tool name' },
              id: body.id
            },
            { status: 400, headers: corsHeaders }
          );
        }
        response = await mcpServer.handleToolCall(body.params.name, body.params.arguments || {});
        break;
        
      default:
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${body.method}` },
            id: body.id
          },
          { status: 404, headers: corsHeaders }
        );
    }

    // 返回成功响应
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        result: response,
        id: body.id
      },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('MCP API Error:', error);
    
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { 
          code: -32603, 
          message: 'Internal error',
          data: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        id: null
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 健康检查端点
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      service: 'zmemory-mcp',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    },
    { headers: corsHeaders }
  );
}
