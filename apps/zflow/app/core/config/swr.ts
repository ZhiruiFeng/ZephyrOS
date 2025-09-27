import { authManager } from '@/lib/auth-manager'

export const authJsonFetcher = async (url: string) => {
  const authHeaders = await authManager.getAuthHeaders()
  const res = await fetch(url, {
    credentials: 'include',
    headers: authHeaders,
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}
