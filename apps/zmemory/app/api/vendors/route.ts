import { NextResponse } from 'next/server';
import { withStandardMiddleware, type EnhancedRequest } from '@/middleware';
import { createVendorService } from '@/services';

/**
 * GET /api/vendors - Get all available vendors and services
 */
async function handleGetVendors(request: EnhancedRequest): Promise<NextResponse> {
  const userId = request.userId!; // Already authenticated by middleware

  const { searchParams } = new URL(request.url);
  const includeServices = searchParams.get('include_services') === 'true';
  const vendorId = searchParams.get('vendor_id');

  const vendorService = createVendorService({ userId });

  if (vendorId) {
    // Get specific vendor with services
    const result = await vendorService.getVendor(vendorId);

    if (result.error) {
      throw result.error; // Middleware will handle error formatting
    }

    return NextResponse.json({ vendor: result.data });
  } else {
    // Get all vendors
    const result = await vendorService.getVendors(includeServices);

    if (result.error) {
      throw result.error; // Middleware will handle error formatting
    }

    return NextResponse.json({ vendors: result.data || [] });
  }
}

// Apply middleware
export const GET = withStandardMiddleware(handleGetVendors, {
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 300 } // 300 requests per 15 minutes
});

// Explicit OPTIONS handler for preflight requests
export const OPTIONS = withStandardMiddleware(async () => {
  return new NextResponse(null, { status: 200 });
}, {
  auth: false,
  rateLimit: false
});
