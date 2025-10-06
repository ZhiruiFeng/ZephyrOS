import { NextRequest, NextResponse } from 'next/server'
import { getAWSAgentUrl, AWS_AGENT_CONFIG } from '@/features/agents/config/aws-agent-config'
import type { AWSAgentRequest, AWSAgentResponse } from '@/features/agents/types/aws-agent'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { input, sessionId, context } = body

    if (!input || !sessionId) {
      return NextResponse.json(
        { error: 'input and sessionId are required' },
        { status: 400 }
      )
    }

    // Prepare AWS Agent request
    const awsRequest: AWSAgentRequest = {
      input,
      sessionId,
      ...(context && { context })
    }

    // Call AWS Agent API
    const awsUrl = getAWSAgentUrl()
    const timeout = AWS_AGENT_CONFIG.timeout

    const response = await fetch(awsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(awsRequest),
      signal: AbortSignal.timeout(timeout),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`AWS Agent returned ${response.status}: ${errorText}`)
    }

    const awsResponse: AWSAgentResponse = await response.json()

    return NextResponse.json({
      success: true,
      message: awsResponse.message,
      actions: awsResponse.actions || [],
      metadata: awsResponse.metadata || {},
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('aborted')

    return NextResponse.json(
      {
        success: false,
        error: isTimeout ? 'AWS Agent request timed out' : errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: isTimeout ? 504 : 500 }
    )
  }
}
