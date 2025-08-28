import { NextRequest, NextResponse } from 'next/server';

/**
 * Security utility functions for API routes
 */

// Define allowed origins based on environment
export function getAllowedOrigins(): string[] {
  if (process.env.NODE_ENV === 'production') {
    const productionOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.PRODUCTION_FRONTEND_URL,
    ].filter(Boolean);
    
    return productionOrigins.length > 0 
      ? productionOrigins as string[]
      : ['https://yourdomain.com']; // fallback for production
  }
  
  // Development origins
  return [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002'
  ];
}

/**
 * Create a JSON response with proper CORS and security headers
 */
export function jsonWithCors(request: NextRequest, body: any, status = 200): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  const res = NextResponse.json(body, { status });
  
  // Only set CORS headers if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Security headers
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return res;
}

/**
 * Handle OPTIONS preflight requests with security headers
 */
export function createOptionsResponse(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  // Only set CORS headers if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return new NextResponse(null, {
    status: 200,
    headers,
  });
}

/**
 * Sanitize error messages to prevent information disclosure
 */
export function sanitizeErrorMessage(error: unknown, defaultMessage = 'Internal server error'): string {
  if (process.env.NODE_ENV === 'development') {
    // In development, show more detailed errors
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
  
  // In production, return generic error message
  return defaultMessage;
}

/**
 * Rate limiting helper (basic implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function isRateLimited(
  identifier: string, 
  windowMs = 15 * 60 * 1000, // 15 minutes
  maxRequests = 100
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const record = requestCounts.get(identifier);
  
  if (!record || record.resetTime <= windowStart) {
    // Reset or create new record
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (record.count >= maxRequests) {
    return true;
  }
  
  record.count++;
  return false;
}

/**
 * Get client IP address for rate limiting
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}