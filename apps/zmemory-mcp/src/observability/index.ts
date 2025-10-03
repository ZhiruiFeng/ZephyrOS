/**
 * Observability Module
 *
 * Exports logger, metrics, and health check functionality
 */

// Logger
export {
  logger,
  Logger,
  defaultLogger,
  createChildLogger,
  createRequestLogger,
  createToolLogger,
  generateRequestId,
  type LogLevel,
  type LogContext,
  type LoggerConfig,
} from './logger.js';

// Metrics
export {
  metrics,
  MetricsCollector,
  RecordMetrics,
  type MetricType,
  type MetricDataPoint,
  type ToolMetrics,
  type APIMetrics,
  type SystemMetrics,
  type AggregatedMetrics,
} from './metrics.js';

// Health
export {
  HealthChecker,
  formatHealthReport,
  type HealthStatus,
  type ComponentHealth,
  type HealthReport,
  type HealthCheckOptions,
} from './health.js';
