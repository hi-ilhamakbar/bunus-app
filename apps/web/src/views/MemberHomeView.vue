<script setup lang="ts">
import { useRouter } from 'vue-router';
import BunusMark from '../components/BunusMark.vue';
import LocaleSwitch from '../components/LocaleSwitch.vue';
import { copy, fill } from '../copy';
import { session } from '../stores/session';

const router = useRouter();

async function logout(): Promise<void> {
  await session.logout();
  await router.replace('/');
}
</script>

<template>
  <div class="page">
    <header class="top">
      <RouterLink to="/member" class="brand" aria-label="Bunus">
        <BunusMark :size="32" />
        <span class="word">Bunus</span>
      </RouterLink>
      <div class="right">
        <LocaleSwitch />
        <button type="button" class="btn btn-outline small" @click="logout">{{ copy.member.logout }}</button>
      </div>
    </header>

    <main id="main" class="content" tabindex="-1">
      <h1>{{ fill(copy.member.greeting, { name: session.customer.value?.displayName ?? '' }) }}</h1>

      <section class="empty" aria-labelledby="empty-title">
        <!-- The only place the bunny shows up inside the product: an empty wallet. -->
        <BunusMark :size="72" />
        <div>
          <h2 id="empty-title" class="t-h3">{{ copy.member.emptyTitle }}</h2>
          <p class="muted body">{{ copy.member.emptyBody }}</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px clamp(16px, 5vw, 48px);
  border-bottom: 1px solid var(--divider);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  text-decoration: none;
}
.brand:hover {
  color: var(--text);
}
.word {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 19px;
}
.right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.small {
  min-height: 40px;
  padding: 0 16px;
  font-size: 14px;
}
.content {
  max-width: 720px;
  margin: 0 auto;
  padding: 36px 16px 64px;
  display: grid;
  gap: 32px;
}
.content:focus {
  outline: none;
}
.empty {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 28px;
  background: var(--bunus-white);
  border-radius: var(--radius-modal);
}
.empty > :first-child {
  flex: none;
}
.body {
  margin-top: 6px;
  max-width: 36em;
}
@media (max-width: 560px) {
  .empty {
    flex-direction: column;
    align-items: flex-start;
    padding: 22px;
  }
}
</style>
