import { API_BASE, authenticatedFetch } from './api-base'

// Energy Days API
export type EnergyDay = {
  user_id: string
  local_date: string
  tz: string
  curve: number[]
  edited_mask: boolean[]
  last_checked_index?: number | null
  last_checked_at?: string | null
  source: 'simulated' | 'user_edited' | 'merged'
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export const energyDaysApi = {
  async list(params?: { start?: string; end?: string; limit?: number }): Promise<EnergyDay[]> {
    const sp = new URLSearchParams()
    if (params?.start) sp.set('start', params.start)
    if (params?.end) sp.set('end', params.end)
    if (params?.limit !== undefined) sp.set('limit', String(params.limit))
    const res = await authenticatedFetch(`${API_BASE}/energy-days?${sp.toString()}`)
    if (!res.ok) throw new Error('Failed to list energy days')
    return res.json()
  },

  async get(date: string): Promise<EnergyDay | null> {
    const res = await authenticatedFetch(`${API_BASE}/energy-days/${date}`)
    if (!res.ok) throw new Error('Failed to get energy day')
    return res.json()
  },

  async upsert(day: Partial<EnergyDay> & { local_date: string; curve: number[]; tz?: string; source?: EnergyDay['source'] }): Promise<EnergyDay> {
    const res = await authenticatedFetch(`${API_BASE}/energy-days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(day),
    })
    if (!res.ok) throw new Error('Failed to upsert energy day')
    return res.json()
  },

  async update(date: string, updates: Partial<Pick<EnergyDay, 'curve' | 'edited_mask' | 'last_checked_index' | 'last_checked_at' | 'tz' | 'source' | 'metadata'>>): Promise<EnergyDay> {
    const res = await authenticatedFetch(`${API_BASE}/energy-days/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update energy day')
    return res.json()
  },

  async setSegment(date: string, index: number, value: number): Promise<EnergyDay> {
    const res = await authenticatedFetch(`${API_BASE}/energy-days/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'set_segment', index, value }),
    })
    if (!res.ok) throw new Error('Failed to set energy segment')
    return res.json()
  }
}