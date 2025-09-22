import { NextRequest, NextResponse } from 'next/server'
import { getMCPClient } from '../../../../lib/agents/mcp-client'
import { getMCPBridge } from '../../../../lib/agents/mcp-bridge'
import { getSystemStatus } from '../../../../lib/agents/init'

export async function GET(request: NextRequest) {
  try {
    // Get system status
    const systemStatus = getSystemStatus()

    // Get MCP client status
    const mcpClient = getMCPClient()
    const mcpConnected = mcpClient.isConnected()

    // Get available MCP tools
    let availableTools: string[] = []
    let mcpError: string | null = null

    try {
      if (mcpConnected) {
        const tools = mcpClient.getAvailableTools()
        availableTools = tools.map(t => t.name)
      }
    } catch (error) {
      mcpError = error instanceof Error ? error.message : 'Unknown MCP error'
    }

    // Get MCP bridge status
    const mcpBridge = getMCPBridge()
    const bridgeInitialized = mcpBridge.isInitialized()
    const registeredProviders = mcpBridge.getRegisteredProviders().map(p => p.id)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      system: systemStatus,
      mcp: {
        connected: mcpConnected,
        bridgeInitialized,
        availableTools,
        registeredProviders,
        error: mcpError
      }
    })

  } catch (error) {
    console.error('MCP status check failed:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}