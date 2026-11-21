<script setup lang="ts">
import { ref } from 'vue'
import type { Horse } from '../engine/models'
defineProps<{ horses: readonly Horse[] }>()
const rosterExpanded = ref(false)
</script>

<template>
  <section
    class="panel"
    aria-labelledby="pool-heading"
  >
    <div class="panel-heading">
      <h2 id="pool-heading">Horse Pool</h2>
      <span class="meta">{{ horses.length }} / 20</span>
    </div>
    <p
      v-if="!horses.length"
      class="empty-state"
    >
      Generate a schedule to meet your twenty contenders. Each horse races three times.
    </p>
    <template v-else>
      <button
        class="roster-toggle"
        type="button"
        aria-controls="horse-roster"
        :aria-expanded="rosterExpanded"
        @click="rosterExpanded = !rosterExpanded"
      >
        {{ rosterExpanded ? 'Hide horses' : `Show all ${horses.length} horses` }}
        <span aria-hidden="true">{{ rosterExpanded ? '−' : '+' }}</span>
      </button>
      <div
        id="horse-roster"
        :class="{ 'is-expanded': rosterExpanded }"
        class="roster-content"
      >
        <table class="horse-table">
          <caption class="sr-only">Twenty horses, their colors and condition scores out of 100</caption>
          <thead>
            <tr>
              <th scope="col">Horse</th>
              <th scope="col">Color</th>
              <th
                scope="col"
                class="numeric"
              >
                Condition
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="horse in horses"
              :key="horse.id"
              data-horse-row
            >
              <th scope="row">{{ horse.name }}</th>
              <td>
                <span class="swatch" :style="{ backgroundColor: horse.color }">
                  <span class="sr-only">{{ horse.color }}</span>
                </span>
              </td>
              <td class="numeric">{{ horse.condition }}<span class="condition-max"> / 100</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<style scoped>
.roster-toggle {
  display: none;
}

.horse-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th, td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid #e1e2da;
}

thead th {
  font-size: 11px;
  color: var(--muted);
  font-weight: 650;
  padding-top: 12px;
  padding-bottom: 12px;
}

tbody th {
  font-weight: 550;
  white-space: nowrap;
}

tbody tr:last-child :is(th, td) {
  border-bottom: 0;
}

tbody tr:nth-child(even) {
  background: #f4f3ec;
}

.numeric {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.condition-max {
  display: none;
}

.swatch {
  display: block;
  width: 17px;
  height: 17px;
  border-radius: 4px;
  border: 1px solid #0003;
}

@media (max-width: 760px) {
  .roster-content:not(.is-expanded) {
    display: none;
  }
  .roster-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-height: 48px;
    padding: 12px 20px;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: var(--paper);
    color: var(--green);
    font: 650 14px/1.5 ui-sans-serif, system-ui, sans-serif;
    text-align: left;
  }
  .roster-toggle:hover {
    background: #eef0e5;
  }
  .horse-table {
    font-size: 14px;
  }
  .condition-max {
    display: inline;
    color: var(--muted);
    font-size: 12px;
  }
  th, td {
    padding: 10px 20px;
  }
}
</style>
