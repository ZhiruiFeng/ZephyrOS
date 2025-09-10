import { agentRegistry } from './registry'
import { OpenAIProvider } from './openai-client'
import { AnthropicProvider } from './anthropic-client'

// Initialize providers
const openAIProvider = new OpenAIProvider()
const anthropicProvider = new AnthropicProvider()

// Register providers
agentRegistry.registerProvider(openAIProvider)
agentRegistry.registerProvider(anthropicProvider)

export { openAIProvider, anthropicProvider }