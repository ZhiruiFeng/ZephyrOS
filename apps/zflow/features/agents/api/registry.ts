import { Agent, AgentProvider } from './types'
import { ensureMCPReady } from './mcp-bridge'

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map()
  private providers: Map<string, AgentProvider> = new Map()
  private mcpInitialized = false

  constructor() {
    this.initializeDefaultAgents()
    this.initializeMCP()
  }

  private async initializeMCP(): Promise<void> {
    if (this.mcpInitialized) return

    try {
      console.log('🔧 Initializing MCP integration in AgentRegistry...')
      await ensureMCPReady()
      this.mcpInitialized = true
      console.log('✅ MCP integration initialized in AgentRegistry')
    } catch (error) {
      console.warn('⚠️ MCP initialization failed in AgentRegistry:', error)
      // Continue without MCP - agents will work without tools
    }
  }

  private initializeDefaultAgents(): void {
    // AWS Bedrock Agent (Default)
    const awsAgent: Agent = {
      id: 'aws-bedrock',
      name: 'AWS Agent',
      description: 'In-house AI agent for task planning and reflection',
      status: 'online',
      model: 'bedrock-agent',
      provider: 'custom'
    }

    // OpenAI GPT-4 Agent
    const gpt4Agent: Agent = {
      id: 'gpt-4',
      name: 'GPT-4',
      description: 'Advanced reasoning and task assistance',
      status: 'online',
      model: 'gpt-4-1106-preview',
      provider: 'openai'
    }

    // Claude Agent
    const claudeAgent: Agent = {
      id: 'claude',
      name: 'Claude',
      description: 'Thoughtful analysis and creative help',
      status: 'online',
      model: 'claude-3-sonnet-20240229',
      provider: 'anthropic'
    }

    // GPT-3.5 Turbo Agent
    const gpt35Agent: Agent = {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Fast and efficient assistance',
      status: 'online',
      model: 'gpt-3.5-turbo-1106',
      provider: 'openai'
    }

    // Add AWS Agent first so it appears first in the list and is the default
    this.agents.set(awsAgent.id, awsAgent)
    this.agents.set(gpt4Agent.id, gpt4Agent)
    this.agents.set(claudeAgent.id, claudeAgent)
    this.agents.set(gpt35Agent.id, gpt35Agent)
  }

  registerProvider(provider: AgentProvider): void {
    this.providers.set(provider.id, provider)
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id)
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values())
  }

  getAvailableAgents(): Agent[] {
    return this.getAllAgents().filter(agent => agent.status === 'online')
  }

  getProvider(providerId: string): AgentProvider | undefined {
    return this.providers.get(providerId)
  }

  updateAgentStatus(agentId: string, status: Agent['status']): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.status = status
    }
  }

  addCustomAgent(agent: Agent): void {
    this.agents.set(agent.id, agent)
  }

  removeAgent(agentId: string): void {
    this.agents.delete(agentId)
  }

  getAgentsByProvider(providerId: string): Agent[] {
    return this.getAllAgents().filter(agent => agent.provider === providerId)
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry()