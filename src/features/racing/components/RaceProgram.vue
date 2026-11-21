<script setup lang="ts">
import { computed } from 'vue'
import type { Horse, RaceSchedule } from '../engine/models'
const props = defineProps<{ schedule: RaceSchedule | null; horses: readonly Horse[]; activeRoundIndex: number | null; completedCount: number }>()
const roster = computed(() => new Map(props.horses.map((horse) => [horse.id, horse])))
</script>

<template>
  <section class="panel" aria-labelledby="program-heading">
    <div class="panel-heading"><h2 id="program-heading">Race Program</h2><span class="meta">6 rounds</span></div>
    <p v-if="!schedule" class="empty-state">Your six-round program will appear here after generation.</p>
    <ol v-else class="round-list">
      <li v-for="(round, index) in schedule.rounds" :key="round.roundNumber" :class="{ active: activeRoundIndex === index, completed: index < completedCount }" data-program-round :aria-current="activeRoundIndex === index ? 'step' : undefined">
        <div class="round-title"><h3>Round {{ round.roundNumber }}</h3><span>{{ round.distance }} m</span><small>{{ index < completedCount ? 'Completed' : activeRoundIndex === index ? 'Current' : 'Upcoming' }}</small></div>
        <ul class="participants" :aria-label="`Round ${round.roundNumber} participants`"><li v-for="id in round.horseIds" :key="id" :title="roster.get(id)?.name"><span class="participant-dot" :style="{ backgroundColor: roster.get(id)?.color }" aria-hidden="true"></span>{{ roster.get(id)?.name }}</li></ul>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.round-list { list-style: none; padding: 0; margin: 0; }
.round-list > li { padding: 16px 17px; border-bottom: 1px solid var(--line); border-left: 3px solid transparent; }
.round-list > li:last-child { border-bottom: 0; }
.round-list > li.active { border-left-color: var(--accent); background: #f6ead7; }
.round-list > li.completed { background: #e8eee1; }
.round-title { display: flex; align-items: baseline; justify-content: space-between; gap: 7px; flex-wrap: wrap; }
h3 { font-size: 13px; margin: 0; font-weight: 700; }
.round-title > span { font-size: 12px; font-variant-numeric: tabular-nums; }
.round-title > small { font-size: 10px; color: var(--muted); }
.participants { list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 10px; padding: 12px 0 0; margin: 0; font-size: 11px; color: #465044; }
.participants li { display: flex; align-items: center; gap: 5px; white-space: nowrap; }
.participant-dot { height: 6px; width: 6px; border-radius: 50%; border: 1px solid #0003; }
@media (min-width: 761px) and (max-width: 1200px) { .round-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); } .round-list > li { border-right: 1px solid var(--line); } }
@media (max-width: 760px) { .participants { grid-template-columns: repeat(2, minmax(0, 1fr)); font-size: 12px; gap: 8px 16px; } .round-title > small { font-size: 11px; } }
</style>
