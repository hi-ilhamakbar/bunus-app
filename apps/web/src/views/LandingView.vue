<script setup lang="ts">
import BunusMark from '../components/BunusMark.vue';
import StampCard from '../components/StampCard.vue';
import { copy } from '../copy';
</script>

<template>
  <div class="page">
    <header class="top">
      <RouterLink to="/" class="brand" aria-label="Bunus home">
        <BunusMark :size="34" />
        <span class="word">Bunus</span>
      </RouterLink>
      <RouterLink to="/member/login" class="login">{{ copy.landing.login }}</RouterLink>
    </header>

    <main id="main" class="hero" tabindex="-1">
      <div class="words">
        <h1 class="t-hero">{{ copy.landing.title }}</h1>
        <p class="t-body-large muted lead">{{ copy.landing.body }}</p>
        <div class="actions">
          <RouterLink to="/member/register" class="btn btn-primary">{{ copy.landing.create }}</RouterLink>
          <RouterLink to="/member/login" class="btn btn-outline">{{ copy.landing.login }}</RouterLink>
        </div>
      </div>

      <figure class="sample">
        <div class="tilt">
          <StampCard
            :title="copy.landing.sampleName"
            note="5 of 8 stamps"
            :count="8"
            :filled="5"
            :columns="4"
            notch="var(--page)"
          />
        </div>
        <figcaption class="t-small muted">{{ copy.landing.sampleLabel }}</figcaption>
      </figure>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px clamp(20px, 5vw, 64px);
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
  text-decoration: none;
}
.brand:hover {
  color: var(--text);
}
.word {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 21px;
}
.login {
  font-weight: 600;
}
.hero {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  align-items: center;
  gap: clamp(32px, 6vw, 96px);
  padding: 24px clamp(20px, 5vw, 64px) 64px;
  max-width: 1160px;
  width: 100%;
  margin: 0 auto;
}
.hero:focus {
  outline: none;
}
.words {
  display: grid;
  gap: 20px;
  justify-items: start;
}
.lead {
  max-width: 34em;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
.sample {
  margin: 0;
  display: grid;
  gap: 14px;
  justify-items: center;
}
.tilt {
  width: 100%;
  max-width: 400px;
  transform: rotate(-2.5deg);
  filter: drop-shadow(0 1px 0 rgb(17 24 39 / 0.06)) drop-shadow(0 10px 18px rgb(17 24 39 / 0.1));
}

@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 36px;
    padding-bottom: 48px;
  }
  .sample {
    justify-items: start;
  }
  .tilt {
    transform: rotate(-1.5deg);
  }
}
</style>
