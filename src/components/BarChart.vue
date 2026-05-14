<script setup lang="ts">
import { computed } from 'vue';
import type { MetricPoint, RegionKey } from '../types';
import { compactNumber } from '../utils/format';

const props = defineProps<{
  points: MetricPoint[];
}>();

const regionOrder: RegionKey[] = ['NA', 'EU', 'APAC', 'LATAM', 'AFR'];

const rows = computed(() => {
  const totals = new Map<RegionKey, number>(regionOrder.map((region) => [region, 0]));
  props.points.slice(-240).forEach((point) => {
    totals.set(point.region, (totals.get(point.region) ?? 0) + point.throughput);
  });
  const max = Math.max(1, ...totals.values());
  return regionOrder.map((region) => ({
    region,
    value: totals.get(region) ?? 0,
    width: `${((totals.get(region) ?? 0) / max) * 100}%`
  }));
});
</script>

<template>
  <section class="panel bar-panel">
    <header class="panel-header">
      <h2>Regional Throughput</h2>
      <span>last 240 ticks</span>
    </header>
    <div class="bars">
      <div v-for="row in rows" :key="row.region" class="bar-row">
        <span>{{ row.region }}</span>
        <div class="bar-track"><i :style="{ width: row.width }"></i></div>
        <strong>{{ compactNumber.format(row.value) }}</strong>
      </div>
    </div>
  </section>
</template>
