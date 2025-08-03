// API monitoring and health check utilities
import { supabase } from './supabase';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  checks: {
    database: HealthCheck;
    memory: HealthCheck;
    api: HealthCheck;
  };
  metrics?: {
    responseTime: number;
    memoryUsage: number;
    uptime: number;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
  details?: Record<string, any>;
}

export class APIMonitoring {
  private static instance: APIMonitoring;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  static getInstance(): APIMonitoring {
    if (!APIMonitoring.instance) {
      APIMonitoring.instance = new APIMonitoring();
    }
    return APIMonitoring.instance;
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const version = process.env.npm_package_version || '1.0.0';

    const [databaseCheck, memoryCheck, apiCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkMemoryUsage(),
      this.checkAPIPerformance(),
    ]);

    // Determine overall status
    const checks = { database: databaseCheck, memory: memoryCheck, api: apiCheck };
    const status = this.determineOverallStatus(checks);

    return {
      service: 'zmemory-api',
      status,
      timestamp,
      version,
      checks,
      metrics: {
        responseTime: apiCheck.responseTime || 0,
        memoryUsage: this.getMemoryUsage(),
        uptime: this.getUptime(),
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simple database connectivity test
      const { error } = await supabase
        .from('memories')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          message: 'Database connection failed',
          responseTime,
          details: { error: error.message },
        };
      }

      // Check if response time is acceptable
      if (responseTime > 1000) {
        return {
          status: 'degraded',
          message: 'Database response time is slow',
          responseTime,
        };
      }

      return {
        status: 'healthy',
        message: 'Database connection successful',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database check failed',
        responseTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheck> {
    try {
      const memoryUsage = this.getMemoryUsage();
      const memoryLimit = 512; // MB - typical Vercel function limit

      if (memoryUsage > memoryLimit * 0.9) {
        return {
          status: 'unhealthy',
          message: 'Memory usage is critically high',
          details: { usage: memoryUsage, limit: memoryLimit },
        };
      }

      if (memoryUsage > memoryLimit * 0.7) {
        return {
          status: 'degraded',
          message: 'Memory usage is high',
          details: { usage: memoryUsage, limit: memoryLimit },
        };
      }

      return {
        status: 'healthy',
        message: 'Memory usage is normal',
        details: { usage: memoryUsage, limit: memoryLimit },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Failed to check memory usage',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private async checkAPIPerformance(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simulate a typical API operation
      const testStartTime = Date.now();
      
      // This would be replaced with an actual internal API call
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const responseTime = Date.now() - testStartTime;

      if (responseTime > 2000) {
        return {
          status: 'unhealthy',
          message: 'API response time is unacceptable',
          responseTime,
        };
      }

      if (responseTime > 500) {
        return {
          status: 'degraded',
          message: 'API response time is slow',
          responseTime,
        };
      }

      return {
        status: 'healthy',
        message: 'API performance is good',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'API performance check failed',
        responseTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  private determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = Object.values(checks).map(check => check.status);

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return Math.round(usage.heapUsed / 1024 / 1024); // Convert to MB
    }
    return 0;
  }

  private getUptime(): number {
    return Math.round((Date.now() - this.startTime) / 1000); // Seconds
  }

  // Request metrics tracking
  async trackRequest(method: string, endpoint: string, statusCode: number, responseTime: number): Promise<void> {
    // In production, you might want to send this to an analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Metrics] ${method} ${endpoint} - ${statusCode} (${responseTime}ms)`);
    }

    // Example: Send to external monitoring service
    // await this.sendToMonitoringService({
    //   method,
    //   endpoint,
    //   statusCode,
    //   responseTime,
    //   timestamp: new Date().toISOString(),
    // });
  }

  // Error tracking
  async trackError(error: Error, context: Record<string, any>): Promise<void> {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', errorInfo);
    }

    // Example: Send to error tracking service like Sentry
    // await this.sendToErrorService(errorInfo);
  }
}

// Middleware for request tracking
export function createRequestTracker() {
  const monitoring = APIMonitoring.getInstance();

  return {
    async trackRequest(method: string, endpoint: string, handler: () => Promise<Response>): Promise<Response> {
      const startTime = Date.now();
      
      try {
        const response = await handler();
        const responseTime = Date.now() - startTime;
        
        await monitoring.trackRequest(method, endpoint, response.status, responseTime);
        
        return response;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        await monitoring.trackError(error as Error, {
          method,
          endpoint,
          responseTime,
        });
        
        throw error;
      }
    },
  };
}