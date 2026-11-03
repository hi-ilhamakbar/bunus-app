<script setup lang="ts">
import BunusMark from '../components/BunusMark.vue';
</script>

<template>
  <main id="main" class="nf">
    <BunusMark :size="48" />
    <h1>This page doesn't exist</h1>
    <p class="muted">The link may be old, or typed a little differently.</p>
    <RouterLink to="/" class="btn btn-primary">Go to Bunus home</RouterLink>
  </main>
</template>

<style scoped>
.nf {
  min-height: 100dvh;
  display: grid;
  place-content: center;
  justify-items: start;
  gap: 14px;
  padding: 24px;
  max-width: 480px;
  margin: 0 auto;
}
</style>
