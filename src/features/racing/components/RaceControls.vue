<script setup lang="ts">
import { computed } from 'vue'
import type { RacePhase } from '../state/racingStore'

const props = defineProps<{
  phase: RacePhase
  canGenerate: boolean
  canStart: boolean
  canPause: boolean
  canResume: boolean
}>()

const emit = defineEmits<{
  generate: []
  start: []
  pause: []
  resume: []
}>()
type PrimaryIntent = 'start' | 'pause' | 'resume'

const primaryAction = computed<{ label: string; intent: PrimaryIntent | null; enabled: boolean }>(() => {
  switch (props.phase) {
    case 'Ready': return { label: 'Start Race', intent: 'start', enabled: props.canStart }
    case 'Running': return { label: 'Pause', intent: 'pause', enabled: props.canPause }
    case 'Paused': return { label: 'Resume', intent: 'resume', enabled: props.canResume }
    case 'Completed': return { label: 'Race complete', intent: null, enabled: false }
    case 'Error':
    case 'Disposed': return { label: 'Race unavailable', intent: null, enabled: false }
    default: return { label: 'Start Race', intent: null, enabled: false }
  }
})

function generate(event?: MouseEvent) {
  if (props.canGenerate && (event?.detail ?? 0) < 2) emit('generate')
}

function activatePrimary(event?: MouseEvent) {
  // A native double-click is one intent, even if the first click changes the label.
  if (!primaryAction.value.enabled || (event?.detail ?? 0) > 1) return
  switch (primaryAction.value.intent) {
    case 'start': emit('start'); break
    case 'pause': emit('pause'); break
    case 'resume': emit('resume'); break
  }
}

function preventRepeatedEnter(event: KeyboardEvent) {
  // Native Space activates on keyup; Enter can otherwise repeat while held down.
  if (event.key === 'Enter' && event.repeat) event.preventDefault()
}
</script>

<template>
  <div id="race-controls" class="control-area" tabindex="-1">
    <div
      class="control-buttons"
      role="group"
      aria-label="Race controls"
    >
      <button
        type="button"
        class="generate"
        :class="{ prominent: canGenerate && !primaryAction.enabled }"
        :disabled="!canGenerate"
        @click="generate"
        @keydown="preventRepeatedEnter"
      >
        Generate
      </button>
      <button
        type="button"
        class="primary-action"
        :disabled="!primaryAction.enabled"
        @click="activatePrimary"
        @keydown="preventRepeatedEnter"
      >
        {{ primaryAction.label }}
      </button>
    </div>
    <span
      class="phase"
      role="status"
      aria-live="polite"
    >
      <span
        class="status-dot"
        :class="{ running: phase === 'Running' }"
        aria-hidden="true"
      ></span>
      {{ phase }}
    </span>
  </div>
</template>

<style scoped>
.control-area {
  scroll-margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-area:focus-visible {
  outline: 3px solid #b34919;
  outline-offset: 4px;
}

.control-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

button {
  min-height: 44px;
  padding: 0 17px;
  border: 1px solid var(--green);
  border-radius: 6px;
  background: transparent;
  color: var(--green);
  font-size: 14px;
  font-weight: 650;
  transition: background .15s, transform .15s;
}

button.prominent,
button.primary-action:enabled {
  background: var(--green);
  color: white;
}

button:enabled:hover {
  background: #dce7d8;
  transform: translateY(-1px);
}

button.prominent:enabled:hover,
button.primary-action:enabled:hover {
  background: #235641;
}

button:enabled:active {
  transform: translateY(1px);
}

button:disabled {
  border-color: #d0d3ca;
  background: #e7e8e1;
  color: #747b73;
}

.primary-action {
  min-width: 108px;
}

.phase {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 650;
  min-width: 94px;
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
}

.status-dot.running {
  background: #2d6d46;
}

@media (max-width: 1060px) {
  .control-area {
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
  }
}

@media (max-width: 760px) {
  .control-area {
    width: 100%;
    align-items: stretch;
  }
  .control-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  button {
    padding: 0 7px;
    font-size: 13px;
  }
  .phase {
    align-self: flex-start;
    min-width: 100px;
  }
}
</style>
