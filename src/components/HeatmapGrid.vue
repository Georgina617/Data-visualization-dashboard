<script setup lang="ts">
import { computed } from 'vue';
import type { MetricPoint, RegionKey } from '../types';
import { clamp } from '../utils/format';

const props = defineProps<{
  points: MetricPoint[];
}>();

const regions: RegionKey[] = ['NA', 'EU', 'APAC', 'LATAM', 'AFR'];

const cells = computed(() => {
  return regions.flatMap((region) => {
    const regionPoints = props.points.filter((point) => point.region === region).slice(-12);
    return Array.from({ length: 12 }, (_, index) => {
      const point = regionPoints[index];
      const pressure = point ? clamp((point.cpu * 0.45 + point.memory * 0.35 + point.errorRate * 9 + point.threats * 0.15), 0, 100) : 0;
      return { id: `${region}-${index}`, region, pressure };
    });
  });
});
</script>

<template>
  <section class="panel heatmap-panel">
    <header class="panel-header">
      <h2>Infrastructure Pressure</h2>
      <span>CPU · memory · errors</span>
    </header>
    <div class="heatmap">
      <span v-for="cell in cells" :key="cell.id" :title="`${cell.region}: ${cell.pressure.toFixed(0)}%`" :style="{ opacity: 0.2 + cell.pressure / 125 }"></span>
    </div>
  </section>
</template>
