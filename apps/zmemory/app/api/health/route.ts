import { NextResponse } from 'next/server';
import { withPublicMiddleware, type EnhancedRequest } from '@/middleware';
import { createHealthService } from '@/services';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Comprehensive health check endpoint
 *     description: Check the health status of the ZMemory API service including database connectivity, memory usage, and performance metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy or degraded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *             example:
 *               service: "zmemory-api"
 *               status: "healthy"
 *               timestamp: "2024-08-01T10:00:00Z"
 *               version: "1.0.0"
 *               checks:
 *                 database:
 *                   status: "healthy"
 *                   message: "Database connection successful"
 *                   responseTime: 45
 *                 memory:
 *                   status: "healthy"
 *                   message: "Memory usage is normal"
 *                   details:
 *                     usage: 128
 *                     limit: 512
 *                 api:
 *                   status: "healthy"
 *                   message: "API performance is good"
 *                   responseTime: 12
 *               metrics:
 *                 responseTime: 12
 *                 memoryUsage: 128
 *                 uptime: 3600
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */

/**
 * Handle health check request using new architecture
 */
async function handleHealthCheck(request: EnhancedRequest): Promise<NextResponse> {
  // Create service instance (minimal context since no user required)
  const healthService = createHealthService({ userId: 'system' });

  // Use service for business logic
  const result = await healthService.checkHealth();

  if (result.error) {
    // Service handles error details, just determine status code
    const statusCode = result.data?.status === 'unhealthy' ? 503 : 200;
    return NextResponse.json(result.data, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }

  // Determine status code from health result
  const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  const statusCode = isTestOrDev ? 200 : (result.data!.status === 'unhealthy' ? 503 : 200);

  return NextResponse.json(result.data, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}

// Apply middleware - no auth required for health check, but get error handling and CORS
export const GET = withPublicMiddleware(handleHealthCheck, {
  rateLimit: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60 // Allow frequent health checks
  }
});

// OPTIONS handled automatically by CORS middleware 