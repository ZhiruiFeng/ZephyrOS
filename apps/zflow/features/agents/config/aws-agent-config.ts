export const AWS_AGENT_CONFIG = {
  apiUrl: process.env.AWS_AGENT_API_URL || '',
  timeout: parseInt(process.env.AWS_AGENT_TIMEOUT || '10000'),
  enabled: Boolean(process.env.AWS_AGENT_API_URL),
}

export function getAWSAgentUrl(): string {
  if (!AWS_AGENT_CONFIG.apiUrl) {
    throw new Error('AWS_AGENT_API_URL not configured in environment variables')
  }
  return AWS_AGENT_CONFIG.apiUrl
}

export function isAWSAgentEnabled(): boolean {
  return AWS_AGENT_CONFIG.enabled
}
