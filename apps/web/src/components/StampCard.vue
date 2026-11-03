<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Check, Gift } from 'lucide-vue-next';

/**
 * The punch card. Used on the landing page as a sample, and on the signup screens where its slots
 * are the real steps. A slot is only marked `filled` when the caller says the server confirmed it.
 * The last slot is the reward and is the only amber thing on the page.
 */
let nextId = 0;
const inkId = `bunus-ink-${(nextId += 1)}`;

const props = withDefaults(
  defineProps<{
    title?: string;
    note?: string;
    /** One label per slot, shown under the slot. Sets the slot count when given. */
    labels?: readonly string[];
    /** Slot count when there are no labels. */
    count?: number;
    /** How many slots carry a stamp. */
    filled: number;
    columns?: number;
    compact?: boolean;
    /** Colour showing through the ticket notches. Match whatever the card sits on. */
    notch?: string;
  }>(),
  { columns: 4, notch: 'var(--page)' },
);

const slots = computed(() =>
  Array.from({ length: props.labels?.length ?? props.count ?? 0 }, (_, i) => ({
    label: props.labels?.[i],
    done: i < props.filled,
    reward: i === (props.labels?.length ?? props.count ?? 0) - 1,
  })),
);

// Tilts are fixed per slot, so a stamp looks hand-pressed but never jitters between renders.
const TILTS = [-3, 2, -2, 3, -1, 2, -3, 1];
const tilt = (i: number): string => `${TILTS[i % TILTS.length]}deg`;

// Only the stamp that just landed animates; slots already filled on first render stay still.
const pressed = ref(-1);
watch(
  () => props.filled,
  (next, prev) => {
    if (next > prev) pressed.value = next - 1;
  },
);
</script>

<template>
  <div class="card" :class="{ compact }" :style="{ '--notch': notch, '--cols': columns }">
    <svg width="0" height="0" aria-hidden="true" focusable="false" class="defs">
      <filter :id="inkId" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
      </filter>
    </svg>

    <header v-if="title || note" class="head">
      <p class="title">{{ title }}</p>
      <p v-if="note" class="note">{{ note }}</p>
    </header>

    <ol class="slots">
      <li v-for="(slot, i) in slots" :key="i" class="slot">
        <span
          class="disc"
          :class="{ done: slot.done, reward: slot.reward, press: pressed === i }"
          :style="slot.done ? { '--tilt': tilt(i), filter: `url(#${inkId})` } : undefined"
        >
          <Gift v-if="slot.reward" :size="compact ? 18 : 22" :stroke-width="2.25" aria-hidden="true" />
          <Check v-else-if="slot.done" :size="compact ? 18 : 22" :stroke-width="3" aria-hidden="true" />
        </span>
        <span v-if="slot.label" class="label">{{ slot.label }}</span>
        <span class="sr-only">{{ slot.done ? ' done' : ' not done yet' }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--bunus-white);
  color: var(--bunus-gray-900);
  border-radius: var(--radius-ticket);
  padding: 20px 22px 22px;
}
.defs {
  position: absolute;
}
/* Ticket notches. */
.card::before,
.card::after {
  content: '';
  position: absolute;
  top: 54px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--notch);
}
.card::before {
  left: -8px;
}
.card::after {
  right: -8px;
}
.compact::before,
.compact::after {
  display: none;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: 18px;
  border-bottom: 2px dashed var(--bunus-gray-300);
}
.title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 16px;
}
.note {
  font-size: 12px;
  color: var(--bunus-gray-700);
  font-variant-numeric: tabular-nums;
}

.slots {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  gap: 18px 10px;
}
.slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.label {
  font-size: 12px;
  line-height: 1.25;
  text-align: center;
  color: var(--bunus-gray-700);
}

.disc {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px dashed var(--bunus-gray-300);
  color: var(--bunus-gray-500);
}
.disc.reward:not(.done) {
  border-color: #c7a24a;
  color: #8a6a12;
}
.disc.done {
  border: 0;
  background: var(--bunus-emerald-800);
  color: var(--bunus-white);
  transform: rotate(var(--tilt, 0deg));
}
.disc.done.reward {
  background: var(--bunus-amber-400);
  color: var(--bunus-gray-900);
}
.disc.press {
  animation: press 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}
@keyframes press {
  0% {
    transform: rotate(var(--tilt, 0deg)) scale(1.55);
    opacity: 0;
  }
  55% {
    transform: rotate(var(--tilt, 0deg)) scale(0.92);
    opacity: 1;
  }
  100% {
    transform: rotate(var(--tilt, 0deg)) scale(1);
  }
}

.compact {
  padding: 14px 14px 14px;
}
.compact .slots {
  gap: 10px 6px;
}
.compact .disc {
  width: 40px;
  height: 40px;
}
.compact .label {
  font-size: 12px;
}
</style>
