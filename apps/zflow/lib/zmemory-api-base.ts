const normalizeOrigin = (value?: string | null): string => {
  if (!value) {
    return ''
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  // Remove any trailing slashes to avoid accidental double separators
  let normalized = trimmed.replace(/\/+$/, '')

  // If someone accidentally includes "/api", strip it so we can append consistently later
  if (normalized.endsWith('/api')) {
    normalized = normalized.slice(0, -4)
  }

  return normalized
}

const rawEnvBase = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_BASE : undefined

export const ZMEMORY_API_ORIGIN = normalizeOrigin(rawEnvBase)
export const IS_ZMEMORY_CROSS_ORIGIN = ZMEMORY_API_ORIGIN.length > 0
export const ZMEMORY_API_BASE = IS_ZMEMORY_CROSS_ORIGIN ? `${ZMEMORY_API_ORIGIN}/api` : '/api'

const ensureLeadingSlash = (path: string): string => (path.startsWith('/') ? path : `/${path}`)

interface BuildUrlOptions {
  includeApiPrefix?: boolean
}

export const buildZmemoryApiUrl = (path: string, options: BuildUrlOptions = {}): string => {
  const includeApiPrefix = options.includeApiPrefix ?? true
  const targetBase = includeApiPrefix ? ZMEMORY_API_BASE : ZMEMORY_API_ORIGIN

  if (!targetBase) {
    return ensureLeadingSlash(path)
  }

  return `${targetBase}${ensureLeadingSlash(path)}`
}

export const resolveZmemoryOrigin = (fallback?: string): string => {
  if (ZMEMORY_API_ORIGIN) {
    return ZMEMORY_API_ORIGIN
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return fallback ? normalizeOrigin(fallback) : ''
}
