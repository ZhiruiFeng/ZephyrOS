import { createClient } from '@supabase/supabase-js';

// TODO: Replace with actual environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ZMemory API configuration
const ZMEMORY_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = {
  baseURL: ZMEMORY_API_URL,

  // Tasks endpoints
  tasks: {
    list: () => `${ZMEMORY_API_URL}/tasks`,
    create: () => `${ZMEMORY_API_URL}/tasks`,
    update: (id: string) => `${ZMEMORY_API_URL}/tasks/${id}`,
    delete: (id: string) => `${ZMEMORY_API_URL}/tasks/${id}`,
  },

  // Memory endpoints
  memories: {
    list: () => `${ZMEMORY_API_URL}/memories`,
    create: () => `${ZMEMORY_API_URL}/memories`,
    search: () => `${ZMEMORY_API_URL}/memories/search`,
  },

  // Conversations endpoints
  conversations: {
    list: () => `${ZMEMORY_API_URL}/conversations`,
    create: () => `${ZMEMORY_API_URL}/conversations`,
  },
};