<script setup lang="ts">
import type { RacePhase } from '../state/racingStore'
defineProps<{ phase: RacePhase; canGenerate: boolean; canStart: boolean; canPause: boolean; canResume: boolean }>()
defineEmits<{ generate: []; start: []; pause: []; resume: [] }>()
</script>

<template>
  <div class="control-area">
    <div class="control-buttons" role="group" aria-label="Race controls">
      <button type="button" class="generate" :disabled="!canGenerate" @click="$emit('generate')">Generate</button>
      <button type="button" :disabled="!canStart" @click="$emit('start')">Start</button>
      <button type="button" :disabled="!canPause" @click="$emit('pause')">Pause</button>
      <button type="button" :disabled="!canResume" @click="$emit('resume')">Resume</button>
    </div>
    <span class="phase" role="status" aria-live="polite"><span class="status-dot" :class="{ running: phase === 'Running' }" aria-hidden="true"></span>{{ phase }}</span>
  </div>
</template>

<style scoped>
.control-area { display: flex; align-items: center; gap: 16px; }
.control-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
button { min-height: 44px; padding: 0 17px; border: 1px solid var(--green); border-radius: 6px; background: transparent; color: var(--green); font-size: 14px; font-weight: 650; transition: background .15s, transform .15s; }
button.generate { background: var(--green); color: white; }
button:enabled:hover { background: #dce7d8; transform: translateY(-1px); }
button.generate:enabled:hover { background: #235641; }
button:enabled:active { transform: translateY(1px); }
button:disabled { border-color: #d0d3ca; background: #e7e8e1; color: #747b73; }
.phase { display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 13px; font-weight: 650; min-width: 94px; padding: 11px 12px; border: 1px solid var(--line); border-radius: 6px; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
.status-dot.running { background: #2d6d46; }
@media (max-width: 1060px) { .control-area { flex-direction: column; align-items: flex-end; gap: 10px; } }
@media (max-width: 760px) { .control-area { width: 100%; align-items: stretch; } .control-buttons { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); } button { padding: 0 7px; font-size: 13px; } .phase { align-self: flex-start; min-width: 100px; } }
</style>
