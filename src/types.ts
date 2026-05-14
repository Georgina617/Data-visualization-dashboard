export type Severity = 'info' | 'warning' | 'critical';
export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'paused' | 'failed';
export type TimeRange = 60 | 300 | 3600;
export type ChartMode = 'line' | 'area';

export interface MetricPoint {
  timestamp: number;
  latency: number;
  throughput: number;
  cpu: number;
  memory: number;
  errorRate: number;
  threats: number;
  region: RegionKey;
}

export type RegionKey = 'NA' | 'EU' | 'APAC' | 'LATAM' | 'AFR';

export interface ActivityEvent {
  id: string;
  timestamp: number;
  severity: Severity;
  source: string;
  message: string;
  metric: keyof Pick<MetricPoint, 'latency' | 'throughput' | 'cpu' | 'memory' | 'errorRate' | 'threats'>;
  value: number;
}

export interface StreamPayload {
  point: MetricPoint;
  event?: ActivityEvent;
}

export interface DashboardFilters {
  query: string;
  severity: Severity | 'all';
  timeRange: TimeRange;
  chartMode: ChartMode;
  visibleSeries: Record<'latency' | 'throughput' | 'cpu' | 'memory', boolean>;
}

export interface MetricSummary {
  label: string;
  value: string;
  delta: number;
  tone: 'good' | 'neutral' | 'warn' | 'bad';
}
