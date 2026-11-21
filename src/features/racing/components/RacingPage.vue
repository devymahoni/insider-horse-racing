<script setup lang="ts">
import { computed, onUnmounted } from 'vue'
import { useRacingStore } from './racingComposition'
import RaceControls from './RaceControls.vue'
import HorsePool from './HorsePool.vue'
import RaceTrack from './RaceTrack.vue'
import RaceProgram from './RaceProgram.vue'
import RaceResults from './RaceResults.vue'
import horseImage from '../../../assets/racing-horse.png'

const store = useRacingStore()
onUnmounted(() => store.$dispose())
const displayRound = computed(() => {
  const state = store.state
  if (!state.schedule) return null
  const index = state.activeRoundIndex ?? (state.phase === 'Completed' ? state.schedule.rounds.length - 1 : 0)
  return state.schedule.rounds[index] ?? null
})
const participants = computed(() => displayRound.value?.horseIds.map((id) => store.state.horses.find((horse) => horse.id === id)!) ?? [])
const pauseMessage = computed(() => {
  if (store.state.phase !== 'Paused') return ''
  if (store.state.pauseReason === 'hidden') return 'Race paused: tab was hidden. Resume to continue.'
  if (store.state.pauseReason === 'frame-gap') return 'Long frame delay. Race paused; progress preserved.'
  return 'Race paused. Your progress is preserved.'
})
</script>

<template>
  <div class="racing-app">
    <a class="skip-link" href="#race-track">Skip to race track</a>
    <header class="masthead">
      <div class="identity">
        <img :src="horseImage" alt="" class="brand-horse" />
        <div><h1>Insider Racing</h1><p>Six rounds. Twenty contenders.</p></div>
      </div>
      <RaceControls :phase="store.state.phase" :can-generate="store.canGenerate" :can-start="store.canStart"
        :can-pause="store.canPause" :can-resume="store.canResume" @generate="store.generate" @start="store.start"
        @pause="store.pause" @resume="store.resume" />
    </header>
    <main class="workspace">
      <div class="track-column">
        <div v-if="store.state.error" class="error-notice" role="alert">
          <strong>Race could not continue.</strong> {{ store.state.error.message }}
          <span v-if="store.canGenerate">Generate a new schedule to try again.</span>
        </div>
        <RaceTrack :round="displayRound" :horses="participants" :positions="store.positions"
          :phase="store.state.phase" :elapsed-ms="store.state.elapsedMs" :status-message="pauseMessage" />
        <RaceResults :results="store.state.results" :horses="store.state.horses" :phase="store.state.phase" />
      </div>
      <HorsePool class="pool-column" :horses="store.state.horses" />
      <RaceProgram class="program-column" :schedule="store.state.schedule" :horses="store.state.horses"
        :active-round-index="store.state.activeRoundIndex" :completed-count="store.state.results.length" />
    </main>
    <footer class="page-footer"><span>Condition and chance. Every round is a new race.</span><span>1200–2200 meters · 6 rounds</span></footer>
  </div>
</template>

<style scoped>
.racing-app { max-width: 1680px; margin: 0 auto; padding: 28px 24px 20px; }
.masthead { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 1px solid var(--line); padding-bottom: 24px; margin-bottom: 24px; }
.identity { display: flex; align-items: center; gap: 18px; }
.brand-horse { width: 88px; height: 55px; object-fit: contain; }
h1 { font: 600 clamp(28px, 3vw, 46px)/1.05 var(--serif); letter-spacing: -.045em; margin: 0 0 7px; }
.identity p { font: italic 15px/1.5 var(--serif); color: var(--muted); margin: 0; }
.workspace { display: grid; grid-template-columns: 245px minmax(0, 1fr) 290px; gap: 20px; align-items: start; }
.track-column { grid-column: 2; grid-row: 1; display: grid; gap: 20px; min-width: 0; }
.pool-column { grid-column: 1; grid-row: 1; }
.program-column { grid-column: 3; grid-row: 1; }
.error-notice { margin: 0; padding: 14px 18px; border: 1px solid #b8c9ac; border-radius: 6px; background: #e8efdf; font-size: 14px; line-height: 1.6; }
.error-notice { border-color: #cf9a88; background: #fff0e9; }
.error-notice span { display: block; }
.page-footer { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-top: 22px; font-size: 12px; color: var(--muted); }
.skip-link { position: absolute; top: -100px; padding: 12px; background: var(--green); color: white; z-index: 10; }
.skip-link:focus { top: 8px; }
@media (max-width: 1200px) { .workspace { grid-template-columns: 220px minmax(0, 1fr); } .program-column { grid-column: 1 / -1; grid-row: 2; } .masthead { align-items: flex-start; } }
@media (max-width: 760px) { .racing-app { padding: 14px; } .masthead { flex-direction: column; gap: 12px; padding-bottom: 14px; margin-bottom: 14px; } .identity { gap: 12px; } .brand-horse { width: 66px; height: 44px; } .workspace { display: flex; flex-direction: column; gap: 20px; } .track-column, .pool-column, .program-column { width: 100%; } .program-column { order: 2; } .pool-column { order: 3; } .page-footer { font-size: 12px; } }
</style>
