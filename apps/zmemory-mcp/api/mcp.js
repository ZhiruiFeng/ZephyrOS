const { ZMemoryMCPServer } = require('../dist/server.js');

// 配置CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Vercel函数处理器
module.exports = async (req, res) => {
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).json({}).end();
  }

  // 添加CORS头
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    // GET请求：健康检查
    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'healthy',
        service: 'zmemory-mcp',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    }

    // POST请求：MCP处理
    if (req.method === 'POST') {
      const body = req.body;
      
      // 验证JSON-RPC格式
      if (!body.jsonrpc || body.jsonrpc !== '2.0') {
        return res.status(400).json({
          jsonrpc: '2.0', 
          error: { code: -32600, message: 'Invalid Request' },
          id: body.id || null 
        });
      }

      // 从环境变量获取配置
      const config = {
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
            return res.status(400).json({
              jsonrpc: '2.0',
              error: { code: -32602, message: 'Invalid params: missing tool name' },
              id: body.id
            });
          }
          response = await mcpServer.handleToolCall(body.params.name, body.params.arguments || {});
          break;
          
        default:
          return res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${body.method}` },
            id: body.id
          });
      }

      // 返回成功响应
      return res.status(200).json({
        jsonrpc: '2.0',
        result: response,
        id: body.id
      });
    }

    // 不支持的方法
    return res.status(405).json({
      error: 'Method not allowed'
    });

  } catch (error) {
    console.error('MCP API Error:', error);
    
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: 'Internal error',
        data: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      id: null
    });
  }
};
