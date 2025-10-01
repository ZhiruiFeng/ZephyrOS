import { NextResponse } from 'next/server'
import { ensureAgentSystemReady } from '@/agents/server'
import { getMCPClient } from '@/agents/server'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic endpoint to check agent system status
 * GET /api/agents/diagnostic
 */
export async function GET() {
  try {
    console.log('🔍 [DIAGNOSTIC] Starting agent system diagnostic...')

    const startTime = Date.now()

    // Try to initialize the agent system
    try {
      await ensureAgentSystemReady()
      console.log('✅ [DIAGNOSTIC] Agent system initialized')
    } catch (initError) {
      console.error('❌ [DIAGNOSTIC] Agent system initialization failed:', initError)
      return NextResponse.json({
        success: false,
        error: 'Agent system initialization failed',
        details: initError instanceof Error ? initError.message : String(initError),
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

    // Get MCP client status
    let mcpStatus = {
      connected: false,
      toolCount: 0,
      sessionId: null,
      error: null as string | null
    }

    try {
      const mcpClient = getMCPClient()
      mcpStatus.connected = mcpClient.isConnected()

      if (!mcpStatus.connected) {
        console.log('⚠️ [DIAGNOSTIC] MCP client not connected, attempting connection...')
        await mcpClient.connect()
        mcpStatus.connected = true
      }

      const tools = mcpClient.getAvailableTools()
      mcpStatus.toolCount = tools.length

      // Try to get session ID if it's an HTTP client
      if ('sessionId' in mcpClient) {
        mcpStatus.sessionId = (mcpClient as any).sessionId
      }

      console.log(`✅ [DIAGNOSTIC] MCP Status: connected=${mcpStatus.connected}, tools=${mcpStatus.toolCount}`)
    } catch (mcpError) {
      console.error('❌ [DIAGNOSTIC] MCP client error:', mcpError)
      mcpStatus.error = mcpError instanceof Error ? mcpError.message : String(mcpError)
    }

    // Get provider status
    const { openAIProvider, anthropicProvider } = await import('@/agents/server')

    let openaiToolCount = 0
    let anthropicToolCount = 0

    try {
      const openai = await openAIProvider()
      openaiToolCount = (openai as any).tools?.length || 0
      console.log(`✅ [DIAGNOSTIC] OpenAI provider: ${openaiToolCount} tools`)
    } catch (e) {
      console.error('❌ [DIAGNOSTIC] OpenAI provider error:', e)
    }

    try {
      const anthropic = await anthropicProvider()
      anthropicToolCount = (anthropic as any).tools?.length || 0
      console.log(`✅ [DIAGNOSTIC] Anthropic provider: ${anthropicToolCount} tools`)
    } catch (e) {
      console.error('❌ [DIAGNOSTIC] Anthropic provider error:', e)
    }

    const duration = Date.now() - startTime

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL: process.env.VERCEL,
        NEXT_PHASE: process.env.NEXT_PHASE,
        MCP_HTTP_URL: process.env.MCP_HTTP_URL || 'https://zmemory-mcp.vercel.app'
      },
      mcp: mcpStatus,
      providers: {
        openai: {
          toolCount: openaiToolCount,
          hasTools: openaiToolCount > 0
        },
        anthropic: {
          toolCount: anthropicToolCount,
          hasTools: anthropicToolCount > 0
        }
      },
      diagnosis: {
        isHealthy: mcpStatus.connected && openaiToolCount > 0,
        issues: [] as string[]
      }
    }

    // Add diagnostic issues
    if (!mcpStatus.connected) {
      result.diagnosis.issues.push('MCP client not connected')
    }
    if (mcpStatus.toolCount === 0) {
      result.diagnosis.issues.push('MCP has no tools available')
    }
    if (openaiToolCount === 0) {
      result.diagnosis.issues.push('OpenAI provider has no tools - agents will hallucinate!')
    }
    if (anthropicToolCount === 0) {
      result.diagnosis.issues.push('Anthropic provider has no tools')
    }
    if (mcpStatus.error) {
      result.diagnosis.issues.push(`MCP error: ${mcpStatus.error}`)
    }

    console.log('🔍 [DIAGNOSTIC] Diagnostic complete:', JSON.stringify(result, null, 2))

    return NextResponse.json(result, {
      status: result.diagnosis.isHealthy ? 200 : 500
    })

  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Diagnostic failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
