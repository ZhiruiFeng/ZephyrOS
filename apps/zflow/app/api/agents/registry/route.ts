import { NextRequest, NextResponse } from 'next/server'
import { agentRegistry } from '../../../lib/agents/registry'

// 禁用静态生成，因为需要运行时环境变量
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const onlineOnly = searchParams.get('onlineOnly') === 'true'

    const agents = onlineOnly 
      ? agentRegistry.getAvailableAgents() 
      : agentRegistry.getAllAgents()

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Error getting agents:', error)
    return NextResponse.json(
      { error: 'Failed to get agents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agentId, status } = await request.json()

    if (!agentId || !status) {
      return NextResponse.json(
        { error: 'agentId and status are required' },
        { status: 400 }
      )
    }

    const agent = agentRegistry.getAgent(agentId)
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    agentRegistry.updateAgentStatus(agentId, status)

    return NextResponse.json({
      success: true,
      agent: agentRegistry.getAgent(agentId)
    })
  } catch (error) {
    console.error('Error updating agent status:', error)
    return NextResponse.json(
      { error: 'Failed to update agent status' },
      { status: 500 }
    )
  }
}