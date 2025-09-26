import { NextRequest, NextResponse } from 'next/server'
import { initializeMCPConnection } from '@/agents/server'

export async function POST(request: NextRequest) {
  try {
    const { toolName, arguments: args } = await request.json()

    if (!toolName) {
      return NextResponse.json(
        { error: 'toolName is required' },
        { status: 400 }
      )
    }

    console.log(`🧪 Testing MCP tool: ${toolName}`, args)

    // Initialize MCP connection
    const mcpClient = await initializeMCPConnection()

    // Call the tool
    const result = await mcpClient.callTool(toolName, args || {})

    console.log(`✅ MCP tool test result:`, result)

    return NextResponse.json({
      success: !result.isError,
      toolName,
      arguments: args,
      result: result.content,
      error: result.isError ? result.content[0]?.text : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ MCP tool test failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Getting available MCP tools for testing...')

    // Initialize MCP connection
    const mcpClient = await initializeMCPConnection()

    // Get available tools
    const tools = mcpClient.getAvailableTools()

    return NextResponse.json({
      success: true,
      availableTools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      })),
      count: tools.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Failed to get MCP tools:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}