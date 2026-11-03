<script setup lang="ts">
import { copy, LOCALES, locale, setLocale } from '../i18n';

defineProps<{ onDark?: boolean }>();
</script>

<template>
  <div class="switch" :class="{ dark: onDark }" role="group" :aria-label="copy.common.language">
    <button
      v-for="l in LOCALES"
      :key="l.code"
      type="button"
      :lang="l.code"
      :aria-pressed="locale === l.code"
      :aria-label="l.name"
      @click="setLocale(l.code)"
    >
      {{ l.label }}
    </button>
  </div>
</template>

<style scoped>
.switch {
  display: inline-flex;
  border: 1px solid var(--control-border);
  border-radius: 8px;
  overflow: hidden;
}
button {
  min-width: 40px;
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: 600 13px var(--font-body);
  cursor: pointer;
}
button[aria-pressed='true'] {
  background: var(--bunus-emerald-800);
  color: #fff;
}
.dark {
  border-color: rgb(255 255 255 / 0.5);
}
.dark button {
  color: #fff;
}
.dark button[aria-pressed='true'] {
  background: #fff;
  color: var(--bunus-emerald-800);
}
</style>
