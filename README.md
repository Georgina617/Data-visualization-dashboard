# PulseGrid Realtime Analytics

A production-style Vue 3 + TypeScript dashboard that simulates live telemetry streaming for monitoring, DevOps, cybersecurity, and trading-terminal style analytics.

## Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The default script binds to `127.0.0.1:5173`.

## What It Includes

- Realtime mocked streaming data with pause/resume controls.
- Bounded in-memory time-series storage for high-frequency updates.
- Live metric cards, canvas line/area chart, regional bar chart, pressure heatmap, and activity feed.
- Time-range filtering, severity filtering, searchable logs, dataset toggles, chart-mode switching, and data-point inspection.
- Dark/light mode and responsive layouts for desktop, tablet, and mobile.
- Payload validation, text sanitization, malformed payload accounting, simulated reconnects, and cleanup of stream subscriptions.

## Architecture

```text
src/
  components/           Reusable dashboard widgets and charts
  services/             Stream simulator and payload validation
  stores/               Centralized telemetry state and derived selectors
  utils/                Formatting and numeric helpers
  types.ts              Shared TypeScript domain models
```

The dashboard uses a centralized Vue reactive store in `src/stores/telemetryStore.ts`. Components consume readonly state, computed selectors, and explicit actions. This keeps ingestion, filtering, retention limits, and UI state away from individual widgets.

## Streaming Approach

`TelemetryStream` simulates a WebSocket-like feed with a steady interval, occasional malformed payloads, and intermittent connection drops. The store validates every payload before accepting it, tracks rejected samples, and maintains reconnect status for the UI.

## Rendering Optimizations

- The main time-series chart is canvas-based and drawn through `requestAnimationFrame`.
- Chart history is capped and rendering samples are sliced to the latest visible window.
- Activity feed rendering is bounded to the newest 70 visible events.
- Store history is capped at 1,800 points and 650 events to avoid unbounded memory growth.
- Components clean up resize observers, animation frames, intervals, and stream listeners.

## Trade-Offs

The charts are custom canvas/SVG-lite UI rather than a heavy charting dependency. That reduces bundle size and improves continuous update control, but it means advanced chart affordances such as zoom brushes and annotations are intentionally minimal in this version.
