<script setup lang="ts">
import BunusMark from '../components/BunusMark.vue';
import { copy } from '../copy';
</script>

<template>
  <main id="main" class="nf">
    <BunusMark :size="48" />
    <h1>{{ copy.notFound.title }}</h1>
    <p class="muted">{{ copy.notFound.body }}</p>
    <RouterLink to="/" class="btn btn-primary">{{ copy.notFound.home }}</RouterLink>
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
