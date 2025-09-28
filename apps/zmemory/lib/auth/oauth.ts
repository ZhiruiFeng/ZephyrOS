import crypto from 'crypto'

// Simple in-memory store for authorization codes and auth transactions
// Note: Suitable for development and single-instance deployments. For production,
// replace with a durable store (e.g., database with TTL) and CSRF protections.

export interface OAuthClient {
  client_id: string
  client_secret?: string
  redirect_uris: string[]
  scopes?: string[]
}

export interface AuthorizeRequest {
  client_id: string
  redirect_uri: string
  scope?: string
  state?: string
  code_challenge?: string
  code_challenge_method?: 'S256' | 'plain'
  created_at: number
}

export interface AuthorizationCode {
  client_id: string
  redirect_uri: string
  user_id: string
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  code_challenge?: string
  code_challenge_method?: 'S256' | 'plain'
  created_at: number
  used_at?: number
}

const CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const TX_TTL_MS = 10 * 60 * 1000 // 10 minutes
const CODE_REUSE_GRACE_MS = 5 * 1000 // 5 seconds grace period for retries

const txStore = new Map<string, AuthorizeRequest>()
const codeStore = new Map<string, AuthorizationCode>()

function now(): number {
  return Date.now()
}

export function generateRandomString(length = 48): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)
}

export function getRegisteredClients(): OAuthClient[] {
  const raw = process.env.OAUTH_CLIENTS
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

export function findClient(client_id: string): OAuthClient | undefined {
  return getRegisteredClients().find(c => c.client_id === client_id)
}

export function isRedirectUriAllowed(client: OAuthClient, redirect_uri: string): boolean {
  return client.redirect_uris.includes(redirect_uri)
}

export function saveAuthorizeTx(txId: string, req: AuthorizeRequest): void {
  txStore.set(txId, req)
}

export function getAuthorizeTx(txId: string): AuthorizeRequest | undefined {
  const tx = txStore.get(txId)
  if (!tx) return undefined
  if (now() - tx.created_at > TX_TTL_MS) {
    txStore.delete(txId)
    return undefined
  }
  return tx
}

export function deleteAuthorizeTx(txId: string): void {
  txStore.delete(txId)
}

export function saveAuthorizationCode(code: string, payload: AuthorizationCode): void {
  codeStore.set(code, payload)
}

export function consumeAuthorizationCode(code: string): AuthorizationCode | undefined {
  const item = codeStore.get(code)
  if (!item) return undefined
  
  const currentTime = now()
  
  // TTL check
  if (currentTime - item.created_at > CODE_TTL_MS) {
    codeStore.delete(code)
    return undefined
  }
  
  // If already used, allow reuse within grace period (for retries)
  if (item.used_at) {
    if (currentTime - item.used_at > CODE_REUSE_GRACE_MS) {
      codeStore.delete(code)
      return undefined
    }
    // Return the same code for retry within grace period
    return item
  }
  
  // Mark as used but keep in store for grace period
  item.used_at = currentTime
  codeStore.set(code, item)
  
  // Schedule cleanup after grace period
  setTimeout(() => {
    codeStore.delete(code)
  }, CODE_REUSE_GRACE_MS)
  
  return item
}

export function hashCodeVerifier(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}


