/**
 * Metrics collection for monitoring and observability.
 *
 * The collector keeps lightweight in-memory aggregates only:
 * - total request counts and latency percentiles
 * - per-endpoint request breakdowns
 * - analysis totals by language
 * - recent request samples for debugging
 */

interface RequestSample {
  requestId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  duration: number;
  timestamp: string;
}

interface EndpointMetrics {
  total: number;
  success: number;
  clientError: number;
  serverError: number;
  methods: Record<string, number>;
  latencies: number[];
  lastStatusCode?: number;
  lastRequestId?: string;
}

interface RequestMetrics {
  total: number;
  success: number;
  clientError: number;
  serverError: number;
  latencies: number[];
  byEndpoint: Record<string, EndpointMetrics>;
}

interface AnalysisMetrics {
  total: number;
  byLanguage: Record<string, number>;
  mistakesFound: number;
  avgDuration: number;
  durations: number[];
}

interface ErrorMetrics {
  total: number;
  byType: Record<string, number>;
  byEndpoint: Record<string, number>;
}

class MetricsCollector {
  private requestMetrics: RequestMetrics = {
    total: 0,
    success: 0,
    clientError: 0,
    serverError: 0,
    latencies: [],
    byEndpoint: {},
  };

  private analysisMetrics: AnalysisMetrics = {
    total: 0,
    byLanguage: {},
    mistakesFound: 0,
    avgDuration: 0,
    durations: [],
  };

  private errorMetrics: ErrorMetrics = {
    total: 0,
    byType: {},
    byEndpoint: {},
  };

  private recentRequests: RequestSample[] = [];
  private startTime: number = Date.now();

  recordRequest(
    statusCode: number,
    duration: number,
    endpoint: string,
    method: string = 'GET',
    requestId: string = 'unknown'
  ): void {
    this.requestMetrics.total++;
    this.requestMetrics.latencies.push(duration);

    if (this.requestMetrics.latencies.length > 1000) {
      this.requestMetrics.latencies.shift();
    }

    const endpointMetrics = this.requestMetrics.byEndpoint[endpoint] || {
      total: 0,
      success: 0,
      clientError: 0,
      serverError: 0,
      methods: {},
      latencies: [],
    };

    endpointMetrics.total++;
    endpointMetrics.methods[method] = (endpointMetrics.methods[method] || 0) + 1;
    endpointMetrics.latencies.push(duration);

    if (endpointMetrics.latencies.length > 100) {
      endpointMetrics.latencies.shift();
    }

    endpointMetrics.lastStatusCode = statusCode;
    endpointMetrics.lastRequestId = requestId;
    this.requestMetrics.byEndpoint[endpoint] = endpointMetrics;

    const sample: RequestSample = {
      requestId,
      method,
      endpoint,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
    };

    this.recentRequests.push(sample);
    if (this.recentRequests.length > 20) {
      this.recentRequests.shift();
    }

    if (statusCode >= 500) {
      this.requestMetrics.serverError++;
      endpointMetrics.serverError++;
      this.recordError('server_error', endpoint);
    } else if (statusCode >= 400) {
      this.requestMetrics.clientError++;
      endpointMetrics.clientError++;
      this.recordError('client_error', endpoint);
    } else {
      this.requestMetrics.success++;
      endpointMetrics.success++;
    }
  }

  recordAnalysis(language: string, mistakeCount: number, duration: number): void {
    this.analysisMetrics.total++;
    this.analysisMetrics.byLanguage[language] = (this.analysisMetrics.byLanguage[language] || 0) + 1;
    this.analysisMetrics.mistakesFound += mistakeCount;
    this.analysisMetrics.durations.push(duration);

    if (this.analysisMetrics.durations.length > 1000) {
      this.analysisMetrics.durations.shift();
    }

    const sum = this.analysisMetrics.durations.reduce((a, b) => a + b, 0);
    this.analysisMetrics.avgDuration = sum / this.analysisMetrics.durations.length;
  }

  recordError(type: string, endpoint: string): void {
    this.errorMetrics.total++;
    this.errorMetrics.byType[type] = (this.errorMetrics.byType[type] || 0) + 1;
    this.errorMetrics.byEndpoint[endpoint] = (this.errorMetrics.byEndpoint[endpoint] || 0) + 1;
  }

  getMetrics() {
    const now = Date.now();
    const uptime = now - this.startTime;

    const endpointSummary = Object.entries(this.requestMetrics.byEndpoint)
      .map(([endpoint, metrics]) => ({
        endpoint,
        total: metrics.total,
        success: metrics.success,
        clientError: metrics.clientError,
        serverError: metrics.serverError,
        methods: metrics.methods,
        avgLatency: metrics.latencies.length
          ? Math.round(metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length)
          : 0,
        p95Latency: this.calculatePercentile(metrics.latencies, 95),
        lastStatusCode: metrics.lastStatusCode,
        lastRequestId: metrics.lastRequestId,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      uptime: {
        seconds: Math.floor(uptime / 1000),
        formatted: this.formatUptime(uptime),
      },
      requests: {
        total: this.requestMetrics.total,
        success: this.requestMetrics.success,
        clientErrors: this.requestMetrics.clientError,
        serverErrors: this.requestMetrics.serverError,
        errorRate: this.requestMetrics.total > 0
          ? ((this.requestMetrics.clientError + this.requestMetrics.serverError) / this.requestMetrics.total * 100).toFixed(2)
          : '0.00',
        avgLatency: this.requestMetrics.latencies.length > 0
          ? Math.round(this.requestMetrics.latencies.reduce((a, b) => a + b, 0) / this.requestMetrics.latencies.length)
          : 0,
        p95Latency: this.calculatePercentile(this.requestMetrics.latencies, 95),
        p99Latency: this.calculatePercentile(this.requestMetrics.latencies, 99),
        byEndpoint: endpointSummary,
        recent: this.recentRequests,
      },
      analysis: {
        total: this.analysisMetrics.total,
        byLanguage: this.analysisMetrics.byLanguage,
        mistakesFound: this.analysisMetrics.mistakesFound,
        avgMistakesPerAnalysis: this.analysisMetrics.total > 0
          ? Number((this.analysisMetrics.mistakesFound / this.analysisMetrics.total).toFixed(2))
          : 0,
        avgDuration: Math.round(this.analysisMetrics.avgDuration),
        p95Duration: this.calculatePercentile(this.analysisMetrics.durations, 95),
      },
      errors: {
        total: this.errorMetrics.total,
        byType: this.errorMetrics.byType,
        byEndpoint: this.errorMetrics.byEndpoint,
      },
    };
  }

  getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
  } {
    const metrics = this.getMetrics();
    const errorRate = Number(metrics.requests.errorRate);

    const checks = {
      uptime: true,
      lowErrorRate: errorRate < 5,
      acceptableLatency: metrics.requests.avgLatency < 1000,
      memoryUsage: process.memoryUsage().heapUsed < 512 * 1024 * 1024,
    };

    const allHealthy = Object.values(checks).every(Boolean);
    const anyHealthy = Object.values(checks).some(Boolean);

    return {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
      checks,
    };
  }

  reset(): void {
    this.requestMetrics = {
      total: 0,
      success: 0,
      clientError: 0,
      serverError: 0,
      latencies: [],
      byEndpoint: {},
    };
    this.analysisMetrics = {
      total: 0,
      byLanguage: {},
      mistakesFound: 0,
      avgDuration: 0,
      durations: [],
    };
    this.errorMetrics = {
      total: 0,
      byType: {},
      byEndpoint: {},
    };
    this.recentRequests = [];
    this.startTime = Date.now();
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

export const metrics = new MetricsCollector();

export function recordRequestMetric(
  statusCode: number,
  duration: number,
  endpoint: string,
  method?: string,
  requestId?: string
): void {
  metrics.recordRequest(statusCode, duration, endpoint, method, requestId);
}

export function recordAnalysisMetric(language: string, mistakeCount: number, duration: number): void {
  metrics.recordAnalysis(language, mistakeCount, duration);
}

export function recordErrorMetric(type: string, endpoint: string): void {
  metrics.recordError(type, endpoint);
}

export default metrics;
