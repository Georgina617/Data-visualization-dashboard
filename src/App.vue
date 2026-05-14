<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import ActivityFeed from './components/ActivityFeed.vue';
import BarChart from './components/BarChart.vue';
import CanvasChart from './components/CanvasChart.vue';
import DashboardControls from './components/DashboardControls.vue';
import HeatmapGrid from './components/HeatmapGrid.vue';
import MetricCard from './components/MetricCard.vue';
import { useTelemetryStore } from './stores/telemetryStore';

const store = useTelemetryStore();
const theme = ref<'dark' | 'light'>('dark');

const connectionLabel = computed(() => {
  const label = store.state.connection;
  return label.charAt(0).toUpperCase() + label.slice(1);
});

function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

onMounted(() => {
  document.documentElement.dataset.theme = theme.value;
  store.start();
});

watch(theme, (value) => {
  document.documentElement.dataset.theme = value;
});

onBeforeUnmount(() => {
  store.dispose();
});
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">PulseGrid realtime command center</p>
        <h1>Streaming Telemetry Analytics</h1>
      </div>
      <div class="status-cluster">
        <span class="connection-pill" :class="store.state.connection">
          <i></i>{{ connectionLabel }}
        </span>
        <span class="drop-pill">{{ store.state.droppedPayloads }} bad payloads</span>
        <button type="button" class="icon-button" aria-label="Toggle theme" @click="toggleTheme">
          {{ theme === 'dark' ? '☾' : '☀' }}
        </button>
      </div>
    </header>

    <DashboardControls
      :filters="store.state.filters"
      :paused="store.state.paused"
      @pause="store.pause"
      @resume="store.resume"
      @range="store.setTimeRange"
      @severity="store.setSeverity"
      @query="store.setQuery"
      @chart-mode="store.setChartMode"
      @series="store.toggleSeries"
    />

    <section class="metrics-grid" aria-label="Realtime metrics">
      <MetricCard v-for="metric in store.summaries.value" :key="metric.label" :metric="metric" />
    </section>

    <section class="dashboard-grid">
      <CanvasChart
        title="Realtime System Load"
        :points="store.visiblePoints.value"
        :visible-series="store.state.filters.visibleSeries"
        :mode="store.state.filters.chartMode"
      />
      <ActivityFeed :events="store.filteredEvents.value" />
      <BarChart :points="store.visiblePoints.value" />
      <HeatmapGrid :points="store.visiblePoints.value" />
    </section>
  </main>
</template>
