<script setup lang="ts">
import BunusMark from './BunusMark.vue';
import { copy } from '../copy';
</script>

<template>
  <div class="shell">
    <aside class="panel">
      <RouterLink to="/" class="brand" aria-label="Bunus home">
        <BunusMark :size="36" />
        <span class="word">Bunus</span>
      </RouterLink>
      <p class="tagline">{{ copy.tagline }}</p>
      <div class="card-slot">
        <slot name="card" />
      </div>
    </aside>

    <main id="main" class="main" tabindex="-1">
      <div class="inner">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(340px, 5fr) 6fr;
}
.panel {
  background: var(--bunus-emerald-800);
  color: #fff;
  padding: 40px clamp(28px, 4vw, 56px);
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  text-decoration: none;
  width: fit-content;
}
.brand:hover {
  color: #fff;
}
.word {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 22px;
}
.tagline {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: clamp(24px, 2.6vw, 32px);
  line-height: 1.2;
  max-width: 14em;
}
.card-slot {
  margin-top: auto;
  max-width: 420px;
  width: 100%;
  padding-bottom: 12px;
}
.main {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px clamp(20px, 5vw, 64px);
}
.main:focus {
  outline: none;
}
.inner {
  width: 100%;
  max-width: 420px;
}

@media (max-width: 860px) {
  .shell {
    display: block;
  }
  .panel {
    padding: 18px 16px 16px;
    gap: 14px;
  }
  .tagline {
    display: none;
  }
  .brand {
    gap: 10px;
  }
  .word {
    font-size: 19px;
  }
  .card-slot {
    max-width: none;
    padding-bottom: 0;
  }
  .main {
    align-items: flex-start;
    padding: 28px 16px 40px;
  }
  .inner {
    max-width: 520px;
    margin: 0 auto;
  }
}
</style>
