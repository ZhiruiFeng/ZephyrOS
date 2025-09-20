import { authManager } from '../auth-manager'

const ABSOLUTE_URL_REGEX = /^https?:\/\//i

// Fetch JSON with Supabase auth when available. Works for both same-origin and cross-origin calls.
export const authJsonFetcher = async (url: string) => {
  const authHeaders = await authManager.getAuthHeaders()
  const isAbsolute = ABSOLUTE_URL_REGEX.test(url)
  let shouldIncludeCredentials = false

  if (!isAbsolute) {
    shouldIncludeCredentials = true
  } else if (typeof window !== 'undefined') {
    shouldIncludeCredentials = url.startsWith(window.location.origin)
  }

  const res = await fetch(url, {
    credentials: shouldIncludeCredentials ? 'include' : 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders
    }
  })

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }

  return res.json()
}
