import type { ActivityEvent, MetricPoint, StreamPayload } from '../types';
import { clamp } from '../utils/format';

const regions = new Set(['NA', 'EU', 'APAC', 'LATAM', 'AFR']);
const severities = new Set(['info', 'warning', 'critical']);

function cleanText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return value.replace(/[<>]/g, '').slice(0, 140);
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(value, min, max);
}

export function validatePayload(payload: unknown): StreamPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = payload as { point?: Partial<MetricPoint>; event?: Partial<ActivityEvent> };
  if (!candidate.point || typeof candidate.point !== 'object') return null;

  const timestamp = numberIn(candidate.point.timestamp, Date.now() - 86_400_000, Date.now() + 10_000, Date.now());
  const point: MetricPoint = {
    timestamp,
    latency: numberIn(candidate.point.latency, 0, 900, 80),
    throughput: numberIn(candidate.point.throughput, 0, 80_000, 20_000),
    cpu: numberIn(candidate.point.cpu, 0, 100, 45),
    memory: numberIn(candidate.point.memory, 0, 100, 60),
    errorRate: numberIn(candidate.point.errorRate, 0, 15, 1),
    threats: numberIn(candidate.point.threats, 0, 200, 0),
    region: regions.has(String(candidate.point.region)) ? candidate.point.region as MetricPoint['region'] : 'NA'
  };

  let event: ActivityEvent | undefined;
  if (candidate.event && typeof candidate.event === 'object') {
    event = {
      id: cleanText(candidate.event.id, crypto.randomUUID()),
      timestamp: numberIn(candidate.event.timestamp, timestamp - 5000, timestamp + 5000, timestamp),
      severity: severities.has(String(candidate.event.severity))
        ? candidate.event.severity as ActivityEvent['severity']
        : 'info',
      source: cleanText(candidate.event.source, 'stream-gateway'),
      message: cleanText(candidate.event.message, 'Telemetry update received'),
      metric: ['latency', 'throughput', 'cpu', 'memory', 'errorRate', 'threats'].includes(String(candidate.event.metric))
        ? candidate.event.metric as ActivityEvent['metric']
        : 'throughput',
      value: numberIn(candidate.event.value, 0, 100_000, 0)
    };
  }

  return { point, event };
}
