import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserIdFromRequest } from '@/auth'
import { jsonWithCors, createOptionsResponse } from '@/lib/security'

// Create Supabase client for service operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// GET /api/vendors - Get all available vendors and services
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return jsonWithCors(request, { error: 'Database not configured' }, 500)
    }

    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return jsonWithCors(request, { error: 'Unauthorized' }, 401)
    }

    const { searchParams } = new URL(request.url)
    const include_services = searchParams.get('include_services') === 'true'
    const vendor_id = searchParams.get('vendor_id')

    if (vendor_id) {
      // Get specific vendor with services
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select(`
          *,
          vendor_services(*)
        `)
        .eq('id', vendor_id)
        .eq('is_active', true)
        .single()

      if (vendorError) {
        console.error('Error fetching vendor:', vendorError)
        return jsonWithCors(request, { error: 'Failed to fetch vendor' }, 500)
      }

      return jsonWithCors(request, { vendor })
    } else {
      // Get all vendors
      let query = supabase
        .from('vendors')
        .select(include_services ? `*, vendor_services(*)` : '*')
        .eq('is_active', true)
        .order('name')

      const { data: vendors, error } = await query

      if (error) {
        console.error('Error fetching vendors:', error)
        return jsonWithCors(request, { error: 'Failed to fetch vendors' }, 500)
      }

      return jsonWithCors(request, { vendors })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return jsonWithCors(request, { error: 'Internal server error' }, 500)
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return createOptionsResponse(request)
}