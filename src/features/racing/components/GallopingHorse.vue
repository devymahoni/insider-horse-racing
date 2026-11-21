<script setup lang="ts">
import { computed } from 'vue'
import gallopSheet from '../../../assets/horse-gallop.svg'

const props = defineProps<{ horseId: string; galloping: boolean }>()
// A stable presentation-only offset keeps the ten runners from moving in lockstep.
const delay = computed(() => {
  const offset = [...props.horseId].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 8
  return `${-offset * .08}s`
})
</script>

<template>
  <span
    class="galloping-horse"
    :class="{ 'is-galloping': galloping }"
    :data-galloping="galloping"
    aria-hidden="true"
    :style="{ '--gallop-delay': delay }"
  >
    <img
      class="gallop-strip"
      :src="gallopSheet"
      alt=""
      draggable="false"
    />
  </span>
</template>

<style scoped>
.galloping-horse {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.gallop-strip {
  display: block;
  width: 800%;
  max-width: none;
  height: 100%;
  animation: horse-gallop .64s steps(8, end) infinite;
  animation-delay: var(--gallop-delay);
  animation-play-state: paused;
}

.is-galloping .gallop-strip {
  animation-play-state: running;
}

/* Translate one whole atlas in eight cell-sized steps. The endpoint only occurs at the loop boundary, so there is no ninth/empty frame or fractional cell offset. */
@keyframes horse-gallop {
  to {
    transform: translateX(-100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .galloping-horse .gallop-strip {
    animation-play-state: paused;
  }
}
</style>
