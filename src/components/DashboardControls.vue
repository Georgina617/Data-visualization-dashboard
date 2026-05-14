<script setup lang="ts">
import type { ChartMode, DashboardFilters, Severity, TimeRange } from '../types';

const props = defineProps<{
  filters: DashboardFilters;
  paused: boolean;
}>();

const emit = defineEmits<{
  pause: [];
  resume: [];
  range: [value: TimeRange];
  severity: [value: Severity | 'all'];
  query: [value: string];
  chartMode: [value: ChartMode];
  series: [value: keyof DashboardFilters['visibleSeries']];
}>();

const ranges: { label: string; value: TimeRange }[] = [
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '1h', value: 3600 }
];

const severities: (Severity | 'all')[] = ['all', 'info', 'warning', 'critical'];
const series = Object.keys(props.filters.visibleSeries) as (keyof DashboardFilters['visibleSeries'])[];
</script>

<template>
  <section class="controls" aria-label="Dashboard controls">
    <button class="primary-action" type="button" @click="paused ? emit('resume') : emit('pause')">
      <span aria-hidden="true">{{ paused ? '▶' : 'Ⅱ' }}</span>
      {{ paused ? 'Resume' : 'Pause' }}
    </button>

    <div class="segmented" aria-label="Time range">
      <button
        v-for="range in ranges"
        :key="range.value"
        type="button"
        :class="{ active: filters.timeRange === range.value }"
        @click="emit('range', range.value)"
      >
        {{ range.label }}
      </button>
    </div>

    <div class="segmented" aria-label="Chart type">
      <button type="button" :class="{ active: filters.chartMode === 'area' }" @click="emit('chartMode', 'area')">
        Area
      </button>
      <button type="button" :class="{ active: filters.chartMode === 'line' }" @click="emit('chartMode', 'line')">
        Line
      </button>
    </div>

    <label class="search">
      <span>Search</span>
      <input
        :value="filters.query"
        type="search"
        placeholder="source, metric, alert"
        @input="emit('query', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <select :value="filters.severity" aria-label="Severity filter" @change="emit('severity', ($event.target as HTMLSelectElement).value as Severity | 'all')">
      <option v-for="severity in severities" :key="severity" :value="severity">
        {{ severity }}
      </option>
    </select>

    <div class="series-toggles" aria-label="Visible datasets">
      <label v-for="name in series" :key="name">
        <input
          type="checkbox"
          :checked="filters.visibleSeries[name]"
          @change="emit('series', name)"
        />
        {{ name }}
      </label>
    </div>
  </section>
</template>
