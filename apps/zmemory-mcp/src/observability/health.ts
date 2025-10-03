/**
 * Health Check System
 *
 * Provides comprehensive health monitoring for the MCP server
 */

import { metrics, SystemMetrics } from './metrics.js';
import { ZMemoryClient } from '../zmemory-client.js';

/**
 * Health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Component health check
 */
export interface ComponentHealth {
  status: HealthStatus;
  message?: string;
  latency_ms?: number;
  last_check?: string;
  details?: Record<string, any>;
}

/**
 * Overall health report
 */
export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  uptime_seconds: number;
  version: string;
  checks: {
    api?: ComponentHealth;
    auth?: ComponentHealth;
    database?: ComponentHealth;
    memory?: ComponentHealth;
    [key: string]: ComponentHealth | undefined;
  };
  metrics?: {
    total_requests?: number;
    error_rate?: number;
    avg_response_time?: number;
    memory_usage_mb?: number;
    cpu_usage_percent?: number;
  };
}

/**
 * Health check options
 */
export interface HealthCheckOptions {
  includeMetrics?: boolean;
  includeDetails?: boolean;
  checkAPI?: boolean;
  checkAuth?: boolean;
}

/**
 * Health checker class
 */
export class HealthChecker {
  private lastHealthCheck?: HealthReport;
  private lastCheckTime?: number;
  private cacheDuration: number = 30000; // 30 seconds

  constructor(
    private zmemoryClient?: ZMemoryClient,
    private version: string = '1.0.0'
  ) {}

  /**
   * Perform health check
   */
  async check(options: HealthCheckOptions = {}): Promise<HealthReport> {
    const {
      includeMetrics = true,
      includeDetails = false,
      checkAPI = true,
      checkAuth = true,
    } = options;

    // Return cached result if still valid
    if (
      this.lastHealthCheck &&
      this.lastCheckTime &&
      Date.now() - this.lastCheckTime < this.cacheDuration
    ) {
      return this.lastHealthCheck;
    }

    const checks: HealthReport['checks'] = {};

    // Check API connectivity
    if (checkAPI && this.zmemoryClient) {
      checks.api = await this.checkAPI();
    }

    // Check authentication
    if (checkAuth && this.zmemoryClient) {
      checks.auth = await this.checkAuth();
    }

    // Check memory usage
    checks.memory = this.checkMemory();

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checks);

    // Get system metrics
    const systemMetrics = metrics.getSystemMetrics();

    const report: HealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime_seconds: systemMetrics.uptime_seconds,
      version: this.version,
      checks,
    };

    // Add metrics if requested
    if (includeMetrics) {
      const toolMetrics = metrics.getToolMetrics();
      const totalCalls = toolMetrics.reduce(
        (sum, m) => sum + m.total_calls,
        0
      );
      const totalErrors = toolMetrics.reduce(
        (sum, m) => sum + m.error_count,
        0
      );

      report.metrics = {
        total_requests: totalCalls,
        error_rate: totalCalls > 0 ? totalErrors / totalCalls : 0,
        avg_response_time: toolMetrics.reduce(
          (sum, m) => sum + m.avg_duration_ms,
          0
        ) / (toolMetrics.length || 1),
        memory_usage_mb: systemMetrics.memory_usage_mb,
        cpu_usage_percent: systemMetrics.cpu_usage_percent,
      };
    }

    // Cache the result
    this.lastHealthCheck = report;
    this.lastCheckTime = Date.now();

    return report;
  }

  /**
   * Check API connectivity
   */
  private async checkAPI(): Promise<ComponentHealth> {
    if (!this.zmemoryClient) {
      return {
        status: 'unhealthy',
        message: 'ZMemory client not initialized',
      };
    }

    const startTime = Date.now();

    try {
      await this.zmemoryClient.healthCheck();
      const latency = Date.now() - startTime;

      return {
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency_ms: latency,
        last_check: new Date().toISOString(),
        message:
          latency < 1000
            ? 'API responding normally'
            : 'API responding slowly',
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `API check failed: ${error.message}`,
        last_check: new Date().toISOString(),
        details: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Check authentication status
   */
  private async checkAuth(): Promise<ComponentHealth> {
    if (!this.zmemoryClient) {
      return {
        status: 'unhealthy',
        message: 'ZMemory client not initialized',
      };
    }

    try {
      const isAuthenticated = this.zmemoryClient.isAuthenticated();

      return {
        status: isAuthenticated ? 'healthy' : 'degraded',
        message: isAuthenticated
          ? 'Authenticated'
          : 'Not authenticated',
        last_check: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Auth check failed: ${error.message}`,
        last_check: new Date().toISOString(),
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): ComponentHealth {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status: HealthStatus = 'healthy';
    let message = 'Memory usage normal';

    if (heapUsagePercent > 90) {
      status = 'unhealthy';
      message = 'Memory usage critical';
    } else if (heapUsagePercent > 75) {
      status = 'degraded';
      message = 'Memory usage high';
    }

    return {
      status,
      message,
      last_check: new Date().toISOString(),
      details: {
        heap_used_mb: Math.round(heapUsedMB * 100) / 100,
        heap_total_mb: Math.round(heapTotalMB * 100) / 100,
        heap_usage_percent: Math.round(heapUsagePercent * 100) / 100,
        rss_mb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      },
    };
  }

  /**
   * Determine overall status from component checks
   */
  private determineOverallStatus(
    checks: HealthReport['checks']
  ): HealthStatus {
    const statuses = Object.values(checks).map((check) => check?.status);

    // If any component is unhealthy, overall is unhealthy
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    // If any component is degraded, overall is degraded
    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Clear health check cache
   */
  clearCache(): void {
    this.lastHealthCheck = undefined;
    this.lastCheckTime = undefined;
  }
}

/**
 * Format health report as text
 */
export function formatHealthReport(report: HealthReport): string {
  const lines: string[] = [];

  // Status indicator
  const statusEmoji = {
    healthy: '✅',
    degraded: '⚠️',
    unhealthy: '❌',
  }[report.status];

  lines.push(`${statusEmoji} 健康状态: ${report.status.toUpperCase()}`);
  lines.push(`时间: ${report.timestamp}`);
  lines.push(`运行时间: ${Math.round(report.uptime_seconds)}秒`);
  lines.push(`版本: ${report.version}`);
  lines.push('');

  // Component checks
  lines.push('组件检查:');
  for (const [name, check] of Object.entries(report.checks)) {
    if (!check) continue;

    const checkEmoji = {
      healthy: '✅',
      degraded: '⚠️',
      unhealthy: '❌',
    }[check.status];

    lines.push(`  ${checkEmoji} ${name}: ${check.status}`);
    if (check.message) {
      lines.push(`     ${check.message}`);
    }
    if (check.latency_ms !== undefined) {
      lines.push(`     延迟: ${check.latency_ms}ms`);
    }
  }

  // Metrics
  if (report.metrics) {
    lines.push('');
    lines.push('性能指标:');
    lines.push(`  总请求数: ${report.metrics.total_requests || 0}`);
    lines.push(
      `  错误率: ${((report.metrics.error_rate || 0) * 100).toFixed(2)}%`
    );
    lines.push(
      `  平均响应时间: ${Math.round(report.metrics.avg_response_time || 0)}ms`
    );
    lines.push(
      `  内存使用: ${Math.round(report.metrics.memory_usage_mb || 0)}MB`
    );
    lines.push(
      `  CPU使用: ${(report.metrics.cpu_usage_percent || 0).toFixed(2)}%`
    );
  }

  return lines.join('\n');
}
