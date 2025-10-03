/**
 * Metrics Collection System
 *
 * Tracks tool usage, response times, and error rates
 */

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric data point
 */
export interface MetricDataPoint {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

/**
 * Tool execution metrics
 */
export interface ToolMetrics {
  tool_name: string;
  total_calls: number;
  success_count: number;
  error_count: number;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  last_called_at?: string;
}

/**
 * API metrics
 */
export interface APIMetrics {
  endpoint: string;
  method: string;
  total_requests: number;
  status_2xx: number;
  status_4xx: number;
  status_5xx: number;
  avg_duration_ms: number;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  uptime_seconds: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  active_connections: number;
}

/**
 * Aggregated metrics
 */
export interface AggregatedMetrics {
  tools: ToolMetrics[];
  api: APIMetrics[];
  system: SystemMetrics;
  period: {
    start: string;
    end: string;
    duration_seconds: number;
  };
}

/**
 * Metrics collector class
 */
export class MetricsCollector {
  private toolCalls: Map<string, number> = new Map();
  private toolSuccesses: Map<string, number> = new Map();
  private toolErrors: Map<string, number> = new Map();
  private toolDurations: Map<string, number[]> = new Map();
  private toolLastCalled: Map<string, number> = new Map();

  private apiRequests: Map<string, Map<string, number>> = new Map();
  private apiDurations: Map<string, number[]> = new Map();

  private startTime: number = Date.now();
  private activeConnections: number = 0;

  /**
   * Record a tool call
   */
  recordToolCall(
    toolName: string,
    durationMs: number,
    success: boolean,
    labels?: Record<string, string>
  ): void {
    // Increment total calls
    this.toolCalls.set(toolName, (this.toolCalls.get(toolName) || 0) + 1);

    // Record success/error
    if (success) {
      this.toolSuccesses.set(
        toolName,
        (this.toolSuccesses.get(toolName) || 0) + 1
      );
    } else {
      this.toolErrors.set(toolName, (this.toolErrors.get(toolName) || 0) + 1);
    }

    // Record duration
    const durations = this.toolDurations.get(toolName) || [];
    durations.push(durationMs);
    this.toolDurations.set(toolName, durations);

    // Record last called timestamp
    this.toolLastCalled.set(toolName, Date.now());
  }

  /**
   * Record an API request
   */
  recordAPIRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    durationMs: number
  ): void {
    const key = `${method}:${endpoint}`;

    // Get or create stats map for this endpoint
    let stats = this.apiRequests.get(key);
    if (!stats) {
      stats = new Map([
        ['total', 0],
        ['2xx', 0],
        ['4xx', 0],
        ['5xx', 0],
      ]);
      this.apiRequests.set(key, stats);
    }

    // Increment counters
    stats.set('total', (stats.get('total') || 0) + 1);

    if (statusCode >= 200 && statusCode < 300) {
      stats.set('2xx', (stats.get('2xx') || 0) + 1);
    } else if (statusCode >= 400 && statusCode < 500) {
      stats.set('4xx', (stats.get('4xx') || 0) + 1);
    } else if (statusCode >= 500) {
      stats.set('5xx', (stats.get('5xx') || 0) + 1);
    }

    // Record duration
    const durations = this.apiDurations.get(key) || [];
    durations.push(durationMs);
    this.apiDurations.set(key, durations);
  }

  /**
   * Increment active connections
   */
  incrementConnections(): void {
    this.activeConnections++;
  }

  /**
   * Decrement active connections
   */
  decrementConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  /**
   * Get tool metrics
   */
  getToolMetrics(toolName?: string): ToolMetrics[] {
    const tools = toolName
      ? [toolName]
      : Array.from(this.toolCalls.keys());

    return tools.map((name) => {
      const durations = this.toolDurations.get(name) || [];
      const sortedDurations = [...durations].sort((a, b) => a - b);

      return {
        tool_name: name,
        total_calls: this.toolCalls.get(name) || 0,
        success_count: this.toolSuccesses.get(name) || 0,
        error_count: this.toolErrors.get(name) || 0,
        avg_duration_ms: this.calculateAverage(durations),
        min_duration_ms: sortedDurations[0] || 0,
        max_duration_ms: sortedDurations[sortedDurations.length - 1] || 0,
        p50_duration_ms: this.calculatePercentile(sortedDurations, 0.5),
        p95_duration_ms: this.calculatePercentile(sortedDurations, 0.95),
        p99_duration_ms: this.calculatePercentile(sortedDurations, 0.99),
        last_called_at: this.toolLastCalled.get(name)
          ? new Date(this.toolLastCalled.get(name)!).toISOString()
          : undefined,
      };
    });
  }

  /**
   * Get API metrics
   */
  getAPIMetrics(): APIMetrics[] {
    const metrics: APIMetrics[] = [];

    for (const [key, stats] of this.apiRequests.entries()) {
      const [method, endpoint] = key.split(':');
      const durations = this.apiDurations.get(key) || [];

      metrics.push({
        endpoint,
        method,
        total_requests: stats.get('total') || 0,
        status_2xx: stats.get('2xx') || 0,
        status_4xx: stats.get('4xx') || 0,
        status_5xx: stats.get('5xx') || 0,
        avg_duration_ms: this.calculateAverage(durations),
      });
    }

    return metrics;
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();

    return {
      uptime_seconds: (Date.now() - this.startTime) / 1000,
      memory_usage_mb: memoryUsage.heapUsed / 1024 / 1024,
      cpu_usage_percent: process.cpuUsage().user / 1000000, // Convert microseconds to percentage
      active_connections: this.activeConnections,
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(): AggregatedMetrics {
    const now = new Date();
    const start = new Date(this.startTime);

    return {
      tools: this.getToolMetrics(),
      api: this.getAPIMetrics(),
      system: this.getSystemMetrics(),
      period: {
        start: start.toISOString(),
        end: now.toISOString(),
        duration_seconds: (now.getTime() - start.getTime()) / 1000,
      },
    };
  }

  /**
   * Get error rate for a tool
   */
  getToolErrorRate(toolName: string): number {
    const total = this.toolCalls.get(toolName) || 0;
    const errors = this.toolErrors.get(toolName) || 0;

    if (total === 0) return 0;
    return errors / total;
  }

  /**
   * Get success rate for a tool
   */
  getToolSuccessRate(toolName: string): number {
    return 1 - this.getToolErrorRate(toolName);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.toolCalls.clear();
    this.toolSuccesses.clear();
    this.toolErrors.clear();
    this.toolDurations.clear();
    this.toolLastCalled.clear();
    this.apiRequests.clear();
    this.apiDurations.clear();
    this.startTime = Date.now();
    this.activeConnections = 0;
  }

  /**
   * Calculate average of array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // Tool metrics
    for (const metric of this.getToolMetrics()) {
      lines.push(
        `# HELP zmemory_tool_calls_total Total number of tool calls`,
        `# TYPE zmemory_tool_calls_total counter`,
        `zmemory_tool_calls_total{tool="${metric.tool_name}"} ${metric.total_calls}`,
        ``,
        `# HELP zmemory_tool_errors_total Total number of tool errors`,
        `# TYPE zmemory_tool_errors_total counter`,
        `zmemory_tool_errors_total{tool="${metric.tool_name}"} ${metric.error_count}`,
        ``,
        `# HELP zmemory_tool_duration_ms Tool execution duration in milliseconds`,
        `# TYPE zmemory_tool_duration_ms histogram`,
        `zmemory_tool_duration_ms_avg{tool="${metric.tool_name}"} ${metric.avg_duration_ms}`,
        `zmemory_tool_duration_ms_p95{tool="${metric.tool_name}"} ${metric.p95_duration_ms}`,
        ``
      );
    }

    // System metrics
    const system = this.getSystemMetrics();
    lines.push(
      `# HELP zmemory_uptime_seconds Server uptime in seconds`,
      `# TYPE zmemory_uptime_seconds gauge`,
      `zmemory_uptime_seconds ${system.uptime_seconds}`,
      ``,
      `# HELP zmemory_memory_usage_mb Memory usage in megabytes`,
      `# TYPE zmemory_memory_usage_mb gauge`,
      `zmemory_memory_usage_mb ${system.memory_usage_mb}`,
      ``
    );

    return lines.join('\n');
  }
}

/**
 * Global metrics collector instance
 */
export const metrics = new MetricsCollector();

/**
 * Decorator for automatic metrics collection
 */
export function RecordMetrics(toolName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = toolName || propertyKey;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let success = false;

      try {
        const result = await originalMethod.apply(this, args);
        success = true;
        return result;
      } finally {
        const duration = Date.now() - startTime;
        metrics.recordToolCall(name, duration, success);
      }
    };

    return descriptor;
  };
}
