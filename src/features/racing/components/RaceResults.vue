<script setup lang="ts">
import { computed } from 'vue'
import type { Horse } from '../engine/models'
import type { RacePhase, RaceResult } from '../state/racingStore'
const props = defineProps<{ results: readonly RaceResult[]; horses: readonly Horse[]; phase: RacePhase }>()
const roster = computed(() => new Map(props.horses.map((horse) => [horse.id, horse])))
</script>

<template>
  <section class="panel" aria-labelledby="results-heading">
    <div class="panel-heading"><h2 id="results-heading">Race Results</h2><span class="meta" aria-live="polite">{{ results.length }} / 6 complete</span></div>
    <p v-if="!results.length" class="empty-state">{{ phase === 'Running' || phase === 'Paused' ? 'The first race is underway. Full results appear when the round finishes.' : 'The finishing order will appear here after each round.' }}</p>
    <div v-else class="results-list">
      <details v-for="result in results" :key="result.roundNumber" :open="result.roundNumber === results.length" data-result-round>
        <summary><span>Round {{ result.roundNumber }}</span><span class="winner-label"><span class="winner-prefix">Winner</span> <strong>{{ roster.get(result.finishers[0]!.horseId)?.name }}</strong></span></summary>
        <table>
          <caption class="sr-only">Full finishing order for round {{ result.roundNumber }}</caption>
          <thead><tr><th scope="col">Place</th><th scope="col">Horse</th><th scope="col" class="numeric">Finish time (s)</th></tr></thead>
          <tbody><tr v-for="finisher in result.finishers" :key="finisher.horseId" :class="{ winner: finisher.rank === 1, second: finisher.rank === 2, third: finisher.rank === 3 }" data-result-finisher>
            <td><span class="rank">{{ finisher.rank }}</span><span v-if="finisher.rank === 1" class="winner-text">Winner</span></td>
            <th scope="row"><span class="result-color" :style="{ backgroundColor: roster.get(finisher.horseId)?.color }" aria-hidden="true"></span>{{ roster.get(finisher.horseId)?.name }}</th>
            <td class="numeric">{{ (finisher.finishTimeMs / 1000).toFixed(3) }} s</td>
          </tr></tbody>
        </table>
      </details>
    </div>
    <p v-if="phase === 'Completed'" class="completion-note" role="status">All six rounds are complete. Generate a new schedule to race again.</p>
  </section>
</template>

<style scoped>
summary { padding: 16px 18px; font: 600 17px/1.4 var(--serif); border-bottom: 1px solid var(--line); }
summary:hover { background: #eef0e5; }
.winner-label { float: right; font: 13px/1.8 ui-sans-serif, system-ui, sans-serif; color: var(--green); }
.winner-prefix { color: var(--muted); font-size: 11px; margin-right: 5px; }
.winner-label strong { font-weight: 750; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 9px 20px; border-bottom: 1px solid #e3e5dc; text-align: left; }
thead th { font-size: 11px; color: var(--muted); font-weight: 600; }
tbody th { font-weight: 550; }
.numeric { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.rank { font-variant-numeric: tabular-nums; display: inline-flex; align-items: center; justify-content: center; width: 23px; height: 23px; margin-right: 4px; border-radius: 50%; }
.winner .rank { background: #dfca9c; color: #593c18; font-weight: 750; }
.second .rank { background: #dfe5de; color: #344738; font-weight: 750; }
.third .rank { background: #ecddce; color: #69492f; font-weight: 750; }
.winner { background: #f3e6ce; }
.winner-text { color: #813b14; font-size: 10px; font-weight: 700; }
.result-color { display: inline-block; height: 9px; width: 9px; border-radius: 2px; border: 1px solid #0003; margin-right: 7px; }
.completion-note { margin: 0; padding: 16px 20px; background: #e4eddb; font-size: 13px; line-height: 1.6; }
@media (max-width: 760px) { summary { font-size: 16px; padding: 14px; } .winner-label { font-size: 12px; } th, td { padding: 9px 10px; } .winner-text { display: block; } .winner-prefix { font-size: 10px; margin-right: 3px; } }
</style>
