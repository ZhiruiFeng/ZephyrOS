import { buildZmemoryApiUrl } from './zmemory-api-base'
import { authenticatedFetch } from './api-base'

/**
 * MindFlow STT Interaction types
 */
export interface MindflowSTTInteraction {
  id: string
  user_id: string
  original_transcription: string
  transcription_api: 'OpenAI' | 'ElevenLabs'
  transcription_model?: string | null
  refined_text?: string | null
  optimization_model?: string | null
  optimization_level?: 'light' | 'medium' | 'heavy' | null
  output_style?: 'conversational' | 'formal' | null
  teacher_explanation?: string | null
  audio_duration?: number | null
  audio_file_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface CreateMindflowSTTInteractionInput {
  original_transcription: string
  transcription_api: 'OpenAI' | 'ElevenLabs'
  transcription_model?: string
  refined_text?: string
  optimization_model?: string
  optimization_level?: 'light' | 'medium' | 'heavy'
  output_style?: 'conversational' | 'formal'
  teacher_explanation?: string
  audio_duration?: number
  audio_file_url?: string
}

export interface MindflowSTTInteractionQueryParams {
  transcription_api?: 'OpenAI' | 'ElevenLabs'
  optimization_level?: 'light' | 'medium' | 'heavy'
  output_style?: 'conversational' | 'formal'
  has_refinement?: boolean
  has_teacher_explanation?: boolean
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export interface MindflowSTTInteractionListResult {
  interactions: MindflowSTTInteraction[]
  total?: number
  has_more?: boolean
}

class MindflowAPIError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'MindflowAPIError'
  }
}

async function mindflowApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildZmemoryApiUrl(`/mindflow-stt-interactions${endpoint}`)

  const response = await authenticatedFetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new MindflowAPIError(response.status, errorData.error || 'Request failed')
  }

  return response.json()
}

export const mindflowApi = {
  /**
   * Create a new MindFlow STT interaction
   */
  async create(data: CreateMindflowSTTInteractionInput): Promise<MindflowSTTInteraction> {
    const response = await mindflowApiRequest<{ interaction: MindflowSTTInteraction }>('', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.interaction
  },

  /**
   * Get a specific interaction by ID
   */
  async getById(id: string): Promise<MindflowSTTInteraction> {
    const response = await mindflowApiRequest<{ interaction: MindflowSTTInteraction }>(`/${id}`)
    return response.interaction
  },

  /**
   * Delete an interaction
   */
  async delete(id: string): Promise<{ message: string }> {
    return mindflowApiRequest(`/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * List/filter interactions
   */
  async list(params: MindflowSTTInteractionQueryParams = {}): Promise<MindflowSTTInteractionListResult> {
    const searchParams = new URLSearchParams()

    // Map parameters
    if (params.transcription_api) searchParams.append('transcription_api', params.transcription_api)
    if (params.optimization_level) searchParams.append('optimization_level', params.optimization_level)
    if (params.output_style) searchParams.append('output_style', params.output_style)
    if (params.has_refinement !== undefined) searchParams.append('has_refinement', params.has_refinement.toString())
    if (params.has_teacher_explanation !== undefined) searchParams.append('has_teacher_explanation', params.has_teacher_explanation.toString())
    if (params.start_date) searchParams.append('start_date', params.start_date)
    if (params.end_date) searchParams.append('end_date', params.end_date)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())

    const queryString = searchParams.toString()
    const endpoint = queryString ? `?${queryString}` : ''

    try {
      const response = await mindflowApiRequest<{ interactions: MindflowSTTInteraction[] }>(endpoint)
      const interactions = response.interactions || []

      return {
        interactions,
        total: interactions.length,
        has_more: params.limit ? interactions.length >= params.limit : false
      }
    } catch (error) {
      console.warn('MindFlow interactions list failed, returning empty results:', error)
      return {
        interactions: [],
        total: 0,
        has_more: false
      }
    }
  },

  /**
   * Get recent interactions (simplified list)
   */
  async getRecent(limit: number = 20): Promise<MindflowSTTInteraction[]> {
    const result = await this.list({ limit })
    return result.interactions
  },

  /**
   * Get interactions with teacher explanations
   */
  async getWithTeacherExplanations(limit: number = 20): Promise<MindflowSTTInteraction[]> {
    const result = await this.list({ has_teacher_explanation: true, limit })
    return result.interactions
  },
}

export { MindflowAPIError }
