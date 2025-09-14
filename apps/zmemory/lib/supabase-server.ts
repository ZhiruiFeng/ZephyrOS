import { createClient } from '@supabase/supabase-js'

// Server-side client using service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

// Server-side client with service role access (bypasses RLS)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Client with user authentication (respects RLS)
export const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export type ChatSessionRow = {
  id: string
  user_id: string
  agent_id: string
  title: string | null
  summary: string | null
  created_at: string
  updated_at: string
  message_count: number
  is_archived: boolean
  metadata: Record<string, any>
}

export type ChatMessageRow = {
  id: string
  session_id: string
  message_id: string
  type: 'user' | 'agent' | 'system'
  content: string
  agent_name: string | null
  tool_calls: any[] | null
  streaming: boolean
  created_at: string
  message_index: number
}