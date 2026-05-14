import type { ActivityEvent, MetricPoint, RegionKey, StreamPayload } from '../types';
import { clamp } from '../utils/format';

type Listener = (payload: unknown) => void;
type StatusListener = (connected: boolean) => void;

const regions: RegionKey[] = ['NA', 'EU', 'APAC', 'LATAM', 'AFR'];
const sources = ['edge-proxy-7', 'kafka-ingest', 'auth-api', 'sensor-fleet', 'fraud-engine', 'cdn-pop'];

export class TelemetryStream {
  private timer: number | undefined;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private connected = false;
  private backoff = 800;
  private state: MetricPoint = {
    timestamp: Date.now(),
    latency: 84,
    throughput: 24_000,
    cpu: 48,
    memory: 62,
    errorRate: 0.8,
    threats: 8,
    region: 'NA'
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  start(): void {
    if (this.timer) return;
    this.connected = true;
    this.backoff = 800;
    this.emitStatus();
    this.timer = window.setInterval(() => this.tick(), 420);
  }

  stop(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
    this.connected = false;
    this.emitStatus();
  }

  dispose(): void {
    this.stop();
    this.listeners.clear();
    this.statusListeners.clear();
  }

  private tick(): void {
    if (Math.random() < 0.012) {
      this.simulateDrop();
      return;
    }

    const payload = Math.random() < 0.018 ? { malformed: true, point: null } : this.nextPayload();
    this.listeners.forEach((listener) => listener(payload));
  }

  private simulateDrop(): void {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = undefined;
    this.connected = false;
    this.emitStatus();

    window.setTimeout(() => {
      this.connected = true;
      this.emitStatus();
      this.timer = window.setInterval(() => this.tick(), 420);
      this.backoff = Math.min(5000, this.backoff * 1.6);
    }, this.backoff);
  }

  private nextPayload(): StreamPayload {
    const t = Date.now();
    const wave = Math.sin(t / 8500);
    const burst = Math.random() > 0.92 ? Math.random() * 28 : 0;

    this.state = {
      timestamp: t,
      latency: clamp(this.state.latency + (Math.random() - 0.46) * 12 + burst, 30, 380),
      throughput: clamp(this.state.throughput + (Math.random() - 0.45) * 3400 + wave * 900, 6000, 68_000),
      cpu: clamp(this.state.cpu + (Math.random() - 0.48) * 5 + burst * 0.1, 8, 99),
      memory: clamp(this.state.memory + (Math.random() - 0.5) * 2.8, 25, 96),
      errorRate: clamp(this.state.errorRate + (Math.random() - 0.5) * 0.45 + burst * 0.025, 0.05, 9),
      threats: clamp(this.state.threats + (Math.random() - 0.55) * 9 + burst * 0.4, 0, 140),
      region: regions[Math.floor(Math.random() * regions.length)]
    };

    const alert = this.buildEvent(this.state, burst);
    return { point: this.state, event: alert };
  }

  private buildEvent(point: MetricPoint, burst: number): ActivityEvent | undefined {
    if (burst <= 0 && Math.random() < 0.62) return undefined;
    const metric = point.errorRate > 4 ? 'errorRate' : point.latency > 180 ? 'latency' : point.threats > 65 ? 'threats' : 'throughput';
    const severity = point.errorRate > 5 || point.threats > 90 ? 'critical' : burst > 12 || point.cpu > 82 ? 'warning' : 'info';
    const source = sources[Math.floor(Math.random() * sources.length)];
    const message = severity === 'critical'
      ? `Anomaly spike detected on ${source}`
      : severity === 'warning'
        ? `Capacity pressure rising in ${point.region}`
        : `Healthy telemetry sample from ${source}`;

    return {
      id: crypto.randomUUID(),
      timestamp: point.timestamp,
      severity,
      source,
      message,
      metric,
      value: point[metric]
    };
  }

  private emitStatus(): void {
    this.statusListeners.forEach((listener) => listener(this.connected));
  }
}
