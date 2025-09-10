import { agentRegistry } from './registry'
import { OpenAIProvider } from './openai-client'
import { AnthropicProvider } from './anthropic-client'

// 在构建时不初始化提供者
let openAIProvider: OpenAIProvider | null = null
let anthropicProvider: AnthropicProvider | null = null

// 延迟初始化函数
function initializeProviders() {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === undefined) {
    console.warn('Providers not initialized during build time')
    return
  }
  
  if (!openAIProvider) {
    openAIProvider = new OpenAIProvider()
    agentRegistry.registerProvider(openAIProvider)
  }
  
  if (!anthropicProvider) {
    anthropicProvider = new AnthropicProvider()
    agentRegistry.registerProvider(anthropicProvider)
  }
}

// 获取提供者的函数
function getOpenAIProvider(): OpenAIProvider {
  if (!openAIProvider) {
    initializeProviders()
  }
  return openAIProvider!
}

function getAnthropicProvider(): AnthropicProvider {
  if (!anthropicProvider) {
    initializeProviders()
  }
  return anthropicProvider!
}

export { getOpenAIProvider as openAIProvider, getAnthropicProvider as anthropicProvider }