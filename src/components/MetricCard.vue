<script setup lang="ts">
import type { MetricSummary } from '../types';

defineProps<{
  metric: MetricSummary;
}>();
</script>

<template>
  <article class="metric-card" :class="`tone-${metric.tone}`">
    <div>
      <span>{{ metric.label }}</span>
      <strong>{{ metric.value }}</strong>
    </div>
    <small :class="{ negative: metric.delta < 0 }">
      {{ metric.delta >= 0 ? '+' : '' }}{{ metric.delta.toFixed(1) }}%
    </small>
  </article>
</template>
