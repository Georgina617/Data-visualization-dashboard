<script setup lang="ts">
import { computed } from 'vue';
import type { ActivityEvent } from '../types';
import { formatRelative } from '../utils/format';

const props = defineProps<{
  events: ActivityEvent[];
}>();

const visibleEvents = computed(() => props.events.slice(0, 70));
</script>

<template>
  <section class="panel feed-panel">
    <header class="panel-header">
      <h2>Live Activity</h2>
      <span>{{ events.length }} events</span>
    </header>
    <div v-if="visibleEvents.length === 0" class="empty-state">No matching events yet.</div>
    <div v-else class="feed-list" role="log" aria-live="polite">
      <article v-for="event in visibleEvents" :key="event.id" class="feed-item" :class="event.severity">
        <i></i>
        <div>
          <header>
            <strong>{{ event.source }}</strong>
            <time>{{ formatRelative(event.timestamp) }}</time>
          </header>
          <p>{{ event.message }}</p>
          <small>{{ event.metric }} · {{ event.value.toFixed(1) }}</small>
        </div>
      </article>
    </div>
  </section>
</template>
