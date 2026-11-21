<script setup lang="ts">
import { computed } from 'vue'
import type { Horse, RaceRound } from '../engine/models'
import type { ProgressSample } from '../engine/profileModels'
import type { RacePhase } from '../state/racingStore'
import horseImage from '../../../assets/racing-horse.png'
const props = defineProps<{ round: RaceRound | null; horses: readonly Horse[]; positions: readonly ProgressSample[]; phase: RacePhase; elapsedMs: number; statusMessage?: string }>()
const progress = computed(() => new Map(props.positions.map((sample) => [sample.horseId, sample.progress])))
const position = (id: string) => progress.value.get(id) ?? (props.phase === 'Completed' ? 1 : 0)
</script>

<template>
  <section id="race-track" class="panel" aria-labelledby="track-heading" tabindex="-1">
    <div class="panel-heading"><h2 id="track-heading">Race Track</h2><span v-if="round" class="meta">Round {{ round.roundNumber }} / {{ round.distance }} m</span><span v-else class="meta">Ready when you are</span></div>
    <div class="track-intro"><span role="status" aria-atomic="true">{{ statusMessage || (phase === 'Completed' ? 'All six rounds complete' : phase === 'Running' && round ? `Round ${round.roundNumber} of 6 racing · ${round.distance} m` : phase === 'Paused' ? 'Progress preserved' : round ? 'Ten contenders at the starting line' : 'Your next race starts here') }}</span><span v-if="phase === 'Running' || phase === 'Paused'" class="elapsed">{{ (elapsedMs / 1000).toFixed(1) }} s</span></div>
    <div v-if="horses.length" class="lanes" aria-label="Ten race lanes">
      <div v-for="(horse, index) in horses" :key="horse.id" class="lane" data-race-lane :style="{ '--progress': position(horse.id) }">
        <div class="lane-label"><span class="lane-number">{{ index + 1 }}</span><span class="horse-label"><span class="color-dot" :style="{ backgroundColor: horse.color }" aria-hidden="true"></span>{{ horse.name }}<small class="lane-progress">{{ Math.round(position(horse.id) * 100) }}%</small></span></div>
        <div class="runway" aria-hidden="true"><span class="start-line"></span><div class="runner"><img :src="horseImage" alt="" /><span class="saddle" :style="{ borderColor: horse.color }">{{ horse.name.replace('Horse ', '') }}</span></div><span class="finish-line"></span></div>
      </div>
    </div>
    <div v-else class="idle-track"><img :src="horseImage" alt="" /><p>Twenty horses. Six rounds.<br />Generate your race program to begin.</p></div>
    <div class="track-footer"><span>Start</span><span class="motion-note">Reduced motion · follow each horse’s percentage</span><span class="finish-label">Finish<span v-if="round"> · {{ round.distance }} m</span></span></div>
  </section>
</template>

<style scoped>
.track-intro { height: 60px; line-height: 1.45; align-items: center; padding: 13px 18px; display: flex; justify-content: space-between; gap: 10px; font-size: 12px; color: var(--muted); border-bottom: 1px solid var(--line); }
.elapsed { font-variant-numeric: tabular-nums; min-width: 42px; text-align: right; }
.lanes { padding: 8px 12px 0; }
.lane { display: flex; align-items: center; min-height: 52px; background: #e1e8d1; border-bottom: 1px solid #fdfdf7; }
.lane:nth-child(even) { background: #d2dfc1; }
.lane-label { display: flex; align-items: center; gap: 8px; padding: 0 10px; width: 125px; flex-shrink: 0; font-size: 12px; z-index: 1; }
.lane-number { font-size: 11px; color: #506345; width: 12px; font-variant-numeric: tabular-nums; }
.horse-label { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; font-weight: 600; }
.color-dot { width: 8px; height: 8px; border-radius: 2px; border: 1px solid #0003; }
.lane-progress { width: 100%; padding-left: 13px; font-size: 10px; font-weight: 500; color: #4a5d40; font-variant-numeric: tabular-nums; }
.runway { position: relative; height: 52px; flex: 1; min-width: 0; margin-right: 10px; background: repeating-linear-gradient(to right, transparent 0, transparent calc(25% - 1px), #ffffff85 calc(25% - 1px), #ffffff85 25%); }
.runner { position: absolute; width: 72px; height: 50px; left: calc(var(--progress) * 100%); transform: translateX(calc(var(--progress) * -100%)); will-change: left, transform; z-index: 1; }
.runner img { width: 100%; height: 100%; object-fit: contain; }
.saddle { position: absolute; top: 20px; left: 33px; border-bottom: 3px solid; padding: 0 3px; background: var(--paper); font-size: 9px; line-height: 12px; font-weight: 800; color: var(--green); }
.start-line { position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: #64785a; }
.finish-label { color: var(--green); font-weight: 650; white-space: nowrap; }
.finish-line { position: absolute; right: 0; top: 0; bottom: 0; width: 8px; background: conic-gradient(#263b2a 25%, #fffdf3 0 50%, #263b2a 0 75%, #fffdf3 0) 0 0 / 8px 8px; }
.track-footer { display: flex; justify-content: space-between; gap: 10px; padding: 12px 22px 13px 137px; font-size: 11px; color: var(--muted); }
.motion-note { display: none; text-align: center; }
.idle-track { min-height: 360px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #e3ead7; margin: 12px; color: #4c6047; text-align: center; }
.idle-track img { width: 170px; height: 100px; object-fit: contain; opacity: .7; }
.idle-track p { margin: 18px 0 0; font: 19px/1.55 var(--serif); }
@media (max-width: 760px) { .lane-label { width: 100px; padding: 0 7px; gap: 5px; font-size: 11px; } .lane-number { width: 9px; } .lanes { padding: 7px 7px 0; } .runner { width: 56px; height: 48px; } .saddle { left: 25px; font-size: 8px; top: 19px; } .track-footer { padding-left: 112px; } .track-intro { height: 60px; line-height: 1.45; align-items: center; padding: 12px; font-size: 11px; } .idle-track { min-height: 300px; } }
@media (prefers-reduced-motion: reduce) { .runner { display: none; } .motion-note { display: inline; } .track-footer { flex-wrap: wrap; } .motion-note { order: 3; width: 100%; } .lane-progress { font-size: 12px; font-weight: 700; } .runway { background: transparent; } }
</style>
