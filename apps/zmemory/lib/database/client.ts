import { createClient } from '@supabase/supabase-js';
import type { DatabaseClient } from './types';

// Re-export from existing auth module for consistency
export { createClientForRequest } from '@/auth';

/**
 * Get a database client instance
 * Prefer the service role key for backend operations so RLS policies allow access.
 */
export function getDatabaseClient(): DatabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Supabase configuration missing');
  }

  const supabaseKey = serviceRoleKey || anonKey;

  if (!supabaseKey) {
    throw new Error('Supabase credentials missing');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Utility function to get current UTC timestamp
 */
export function nowUTC(): string {
  return new Date().toISOString();
}

/**
 * Helper to format PostgreSQL tstzrange for happened_range fields
 */
export function formatPostgreSQLTstzRange(start: string, end?: string): string {
  if (end) {
    return `[${start},${end})`;
  }
  return `[${start},)`;
}

/**
 * Helper to convert tags array to PostgreSQL array format
 */
export function formatPostgreSQLArray(items: string[]): string {
  return `{${items.map(item => `"${item.replace(/"/g, '\\"')}"`).join(',')}}`;
}

/**
 * Helper to safely parse PostgreSQL array strings
 */
export function parsePostgreSQLArray(arrayString: string | null): string[] {
  if (!arrayString) return [];

  try {
    // Remove braces and split by comma, handling quoted strings
    const cleaned = arrayString.replace(/^\{|\}$/g, '');
    if (!cleaned) return [];

    return cleaned.split(',').map(item => {
      // Remove quotes and unescape
      return item.replace(/^"|"$/g, '').replace(/\\"/g, '"');
    });
  } catch (error) {
    console.warn('Failed to parse PostgreSQL array:', arrayString, error);
    return [];
  }
}

/**
 * Helper to build geographic bounding box conditions
 */
export function buildBoundingBox(lat: number, lng: number, distanceKm: number) {
  const latRange = distanceKm / 111; // ~111 km per degree of latitude
  const lngRange = distanceKm / (111 * Math.cos(lat * Math.PI / 180));

  return {
    minLat: lat - latRange,
    maxLat: lat + latRange,
    minLng: lng - lngRange,
    maxLng: lng + lngRange
  };
}
