<script setup lang="ts">
import { copy } from './i18n';
</script>

<template>
  <a class="skip" href="#main">{{ copy.common.skip }}</a>
  <RouterView />
</template>

<style>
.skip {
  position: absolute;
  left: 8px;
  top: -48px;
  z-index: 10;
  padding: 10px 14px;
  background: var(--bunus-gray-900);
  color: #fff;
  border-radius: 8px;
}
.skip:focus {
  top: 8px;
}
</style>
