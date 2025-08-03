import { NextResponse } from 'next/server';
import { APIMonitoring } from '../../../lib/monitoring';

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
export async function GET() {
  try {
    const monitoring = APIMonitoring.getInstance();
    const healthResult = await monitoring.performHealthCheck();
    
    const statusCode = healthResult.status === 'unhealthy' ? 503 : 200;
    
    return NextResponse.json(healthResult, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // Fallback health check if monitoring fails
    return NextResponse.json({
      service: 'zmemory-api',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
} 