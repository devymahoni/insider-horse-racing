<script setup lang="ts">
import RacingPage from './features/racing/components/RacingPage.vue'
</script>

<template>
  <RacingPage />
</template>

<style>
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #242c27;
  background: #f5f3ed;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  --paper: #f5f3ed;
  --surface: #fffcf6;
  --ink: #242c27;
  --muted: #59645c;
  --green: #153f32;
  --line: #c9cec4;
  --accent: #a64416;
  --serif: Georgia, 'Times New Roman', serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
}

button, summary {
  -webkit-tap-highlight-color: transparent;
}

button {
  font: inherit;
}

button:not(:disabled), summary {
  cursor: pointer;
}

button:focus-visible, summary:focus-visible, a:focus-visible {
  outline: 3px solid #b34919;
  outline-offset: 4px;
}

button:disabled {
  cursor: not-allowed;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

h1, h2, h3, p {
  margin-top: 0;
}

.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  min-width: 0;
}

.panel-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 15px 20px;
  background: var(--green);
  color: white;
}

.panel-heading h2 {
  margin: 0;
  font: 600 23px/1.15 var(--serif);
  letter-spacing: -.02em;
}

.panel-heading .meta {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.empty-state {
  padding: 28px 22px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation: none !important;
    transition: none !important;
  }
}
</style>
