import { computed, reactive, readonly } from 'vue';
import type { ActivityEvent, ConnectionState, DashboardFilters, MetricPoint, MetricSummary } from '../types';
import { TelemetryStream } from '../services/streamSimulator';
import { validatePayload } from '../services/validation';
import { compactNumber, preciseNumber } from '../utils/format';

const MAX_POINTS = 1800;
const MAX_EVENTS = 650;
const stream = new TelemetryStream();
let unsubscribeStream: (() => void) | undefined;
let unsubscribeStatus: (() => void) | undefined;
let badPayloads = 0;

const state = reactive({
  points: [] as MetricPoint[],
  events: [] as ActivityEvent[],
  connection: 'connecting' as ConnectionState,
  paused: false,
  droppedPayloads: 0,
  filters: {
    query: '',
    severity: 'all',
    timeRange: 300,
    chartMode: 'area',
    visibleSeries: {
      latency: true,
      throughput: true,
      cpu: true,
      memory: false
    }
  } as DashboardFilters
});

function ingest(payload: unknown): void {
  if (state.paused) return;
  const validated = validatePayload(payload);
  if (!validated) {
    badPayloads += 1;
    state.droppedPayloads = badPayloads;
    return;
  }

  state.points.push(validated.point);
  if (state.points.length > MAX_POINTS) {
    state.points.splice(0, state.points.length - MAX_POINTS);
  }

  if (validated.event) {
    state.events.unshift(validated.event);
    if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
  }
}

function start(): void {
  if (!unsubscribeStream) unsubscribeStream = stream.subscribe(ingest);
  if (!unsubscribeStatus) {
    unsubscribeStatus = stream.onStatus((connected) => {
      if (state.paused) return;
      state.connection = connected ? 'live' : 'reconnecting';
    });
  }
  state.connection = 'connecting';
  stream.start();
}

function pause(): void {
  state.paused = true;
  state.connection = 'paused';
}

function resume(): void {
  state.paused = false;
  state.connection = 'live';
  stream.start();
}

function dispose(): void {
  unsubscribeStream?.();
  unsubscribeStatus?.();
  stream.dispose();
}

function setTimeRange(range: DashboardFilters['timeRange']): void {
  state.filters.timeRange = range;
}

function setSeverity(severity: DashboardFilters['severity']): void {
  state.filters.severity = severity;
}

function setQuery(query: string): void {
  state.filters.query = query.slice(0, 80);
}

function toggleSeries(series: keyof DashboardFilters['visibleSeries']): void {
  state.filters.visibleSeries[series] = !state.filters.visibleSeries[series];
}

function setChartMode(mode: DashboardFilters['chartMode']): void {
  state.filters.chartMode = mode;
}

const visiblePoints = computed(() => {
  const cutoff = Date.now() - state.filters.timeRange * 1000;
  return state.points.filter((point) => point.timestamp >= cutoff);
});

const filteredEvents = computed(() => {
  const query = state.filters.query.trim().toLowerCase();
  return state.events.filter((event) => {
    const severityMatch = state.filters.severity === 'all' || event.severity === state.filters.severity;
    const queryMatch = !query || `${event.source} ${event.message} ${event.metric}`.toLowerCase().includes(query);
    return severityMatch && queryMatch;
  });
});

const summaries = computed<MetricSummary[]>(() => {
  const latest = visiblePoints.value.at(-1);
  const previous = visiblePoints.value.at(-12) ?? visiblePoints.value.at(0);
  if (!latest) {
    return [
      { label: 'Throughput', value: '0', delta: 0, tone: 'neutral' },
      { label: 'Latency', value: '0 ms', delta: 0, tone: 'neutral' },
      { label: 'Error rate', value: '0%', delta: 0, tone: 'neutral' },
      { label: 'Threats', value: '0', delta: 0, tone: 'neutral' }
    ];
  }

  const delta = (current: number, before = current) => before === 0 ? 0 : ((current - before) / before) * 100;
  return [
    { label: 'Throughput', value: compactNumber.format(latest.throughput), delta: delta(latest.throughput, previous?.throughput), tone: 'good' },
    { label: 'Latency', value: `${Math.round(latest.latency)} ms`, delta: delta(latest.latency, previous?.latency), tone: latest.latency > 190 ? 'bad' : latest.latency > 130 ? 'warn' : 'good' },
    { label: 'Error rate', value: `${preciseNumber.format(latest.errorRate)}%`, delta: delta(latest.errorRate, previous?.errorRate), tone: latest.errorRate > 4 ? 'bad' : latest.errorRate > 2 ? 'warn' : 'good' },
    { label: 'Threats', value: preciseNumber.format(latest.threats), delta: delta(latest.threats, previous?.threats), tone: latest.threats > 85 ? 'bad' : latest.threats > 45 ? 'warn' : 'neutral' }
  ];
});

export function useTelemetryStore() {
  return {
    state: readonly(state),
    visiblePoints,
    filteredEvents,
    summaries,
    start,
    pause,
    resume,
    dispose,
    setTimeRange,
    setSeverity,
    setQuery,
    toggleSeries,
    setChartMode
  };
}
