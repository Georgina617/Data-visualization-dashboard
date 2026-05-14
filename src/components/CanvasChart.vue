<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import type { DashboardFilters, MetricPoint } from '../types';
import { compactNumber, formatClock } from '../utils/format';

type SeriesKey = keyof DashboardFilters['visibleSeries'];

const props = defineProps<{
  title: string;
  points: MetricPoint[];
  visibleSeries: DashboardFilters['visibleSeries'];
  mode: 'line' | 'area';
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const hover = shallowRef<{ x: number; y: number } | null>(null);
const tooltip = ref('');
let frame = 0;
let observer: ResizeObserver | undefined;

const colors: Record<SeriesKey, string> = {
  latency: '#72ddf7',
  throughput: '#8bd450',
  cpu: '#f4c542',
  memory: '#ff7a90'
};

const activeSeries = computed(() => {
  return (Object.keys(props.visibleSeries) as SeriesKey[]).filter((key) => props.visibleSeries[key]);
});

function normalizeValue(point: MetricPoint, key: SeriesKey): number {
  if (key === 'throughput') return point.throughput / 700;
  return point[key];
}

function scheduleDraw(): void {
  window.cancelAnimationFrame(frame);
  frame = window.requestAnimationFrame(draw);
}

function draw(): void {
  const target = canvas.value;
  if (!target) return;
  const parent = target.parentElement;
  if (!parent) return;
  const rect = parent.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  target.width = Math.max(1, Math.floor(rect.width * dpr));
  target.height = Math.max(1, Math.floor(rect.height * dpr));
  target.style.width = `${rect.width}px`;
  target.style.height = `${rect.height}px`;

  const ctx = target.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const padding = { top: 24, right: 18, bottom: 30, left: 42 };
  const width = rect.width - padding.left - padding.right;
  const height = rect.height - padding.top - padding.bottom;
  const points = props.points.slice(-420);

  ctx.strokeStyle = 'rgba(141, 163, 191, 0.18)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = padding.top + (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + width, y);
    ctx.stroke();
  }

  if (points.length < 2 || activeSeries.value.length === 0) {
    ctx.fillStyle = 'rgba(218, 227, 240, 0.7)';
    ctx.font = '13px Inter, system-ui, sans-serif';
    ctx.fillText('Waiting for live samples...', padding.left, padding.top + 24);
    return;
  }

  const allValues = points.flatMap((point) => activeSeries.value.map((key) => normalizeValue(point, key)));
  const min = Math.min(...allValues) * 0.92;
  const max = Math.max(...allValues) * 1.08;
  const span = Math.max(1, max - min);
  const xFor = (index: number) => padding.left + (index / Math.max(1, points.length - 1)) * width;
  const yFor = (value: number) => padding.top + height - ((value - min) / span) * height;

  activeSeries.value.forEach((key) => {
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = xFor(index);
      const y = yFor(normalizeValue(point, key));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    if (props.mode === 'area') {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + height);
      gradient.addColorStop(0, `${colors[key]}55`);
      gradient.addColorStop(1, `${colors[key]}00`);
      ctx.lineTo(padding.left + width, padding.top + height);
      ctx.lineTo(padding.left, padding.top + height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.beginPath();
      points.forEach((point, index) => {
        const x = xFor(index);
        const y = yFor(normalizeValue(point, key));
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    }

    ctx.strokeStyle = colors[key];
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  });

  const last = points.at(-1);
  if (last) {
    ctx.fillStyle = 'rgba(224, 235, 249, 0.72)';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.fillText(formatClock(last.timestamp), padding.left, rect.height - 9);
    ctx.textAlign = 'right';
    ctx.fillText(compactNumber.format(max), rect.width - padding.right, padding.top + 12);
    ctx.textAlign = 'left';
  }

  if (hover.value) {
    const index = Math.round(((hover.value.x - padding.left) / width) * (points.length - 1));
    const point = points[Math.max(0, Math.min(points.length - 1, index))];
    const x = xFor(Math.max(0, Math.min(points.length - 1, index)));
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + height);
    ctx.stroke();
    tooltip.value = `${formatClock(point.timestamp)} | latency ${Math.round(point.latency)}ms | cpu ${Math.round(point.cpu)}%`;
  }
}

function onPointerMove(event: PointerEvent): void {
  const rect = (event.currentTarget as HTMLCanvasElement).getBoundingClientRect();
  hover.value = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  scheduleDraw();
}

function onPointerLeave(): void {
  hover.value = null;
  tooltip.value = '';
  scheduleDraw();
}

watch(() => [props.points.length, props.visibleSeries, props.mode], scheduleDraw, { deep: true });

onMounted(() => {
  observer = new ResizeObserver(scheduleDraw);
  if (canvas.value?.parentElement) observer.observe(canvas.value.parentElement);
  scheduleDraw();
});

onBeforeUnmount(() => {
  observer?.disconnect();
  window.cancelAnimationFrame(frame);
});
</script>

<template>
  <section class="panel chart-panel">
    <header class="panel-header">
      <h2>{{ title }}</h2>
      <div class="legend">
        <span v-for="key in activeSeries" :key="key">
          <i :style="{ background: colors[key] }"></i>{{ key }}
        </span>
      </div>
    </header>
    <div class="canvas-wrap">
      <canvas ref="canvas" @pointermove="onPointerMove" @pointerleave="onPointerLeave"></canvas>
      <output v-if="tooltip" class="chart-tooltip">{{ tooltip }}</output>
    </div>
  </section>
</template>
