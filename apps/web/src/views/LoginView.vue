<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, authApi } from '../api/client';
import AuthLayout from '../components/AuthLayout.vue';
import StampCard from '../components/StampCard.vue';
import TextField from '../components/TextField.vue';
import { copy } from '../copy';
import { safeNext } from '../router';
import { session } from '../stores/session';

const route = useRoute();
const router = useRouter();

const form = reactive({ email: '', password: '' });
const busy = ref(false);
const formError = ref('');
const fields = reactive<{ email?: string; password?: string }>({});

async function submit(): Promise<void> {
  formError.value = '';
  fields.email = form.email.includes('@') ? undefined : copy.errors.emailInvalid;
  fields.password = form.password ? undefined : 'Enter your password.';
  if (fields.email || fields.password) return;

  busy.value = true;
  try {
    const { customer } = await authApi.login(form.email, form.password);
    session.setCustomer(customer);
    await router.replace(safeNext(route.query.next));
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : copy.errors.generic;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <template #card>
      <StampCard compact :count="4" :filled="0" notch="var(--bunus-emerald-800)" />
    </template>

    <h1>{{ copy.login.title }}</h1>
    <p class="muted intro">{{ copy.login.body }}</p>

    <form class="form" novalidate @submit.prevent="submit">
      <p v-if="formError" class="alert" role="alert">{{ formError }}</p>
      <TextField
        v-model="form.email"
        :label="copy.login.email"
        type="email"
        autocomplete="email"
        inputmode="email"
        :error="fields.email"
      />
      <TextField
        v-model="form.password"
        :label="copy.login.password"
        type="password"
        autocomplete="current-password"
        :error="fields.password"
      />
      <button class="btn btn-primary btn-block" type="submit" :disabled="busy">
        {{ copy.login.submit }}
      </button>
    </form>

    <p class="alt muted">
      {{ copy.login.newHere }}
      <RouterLink to="/member/register">{{ copy.login.create }}</RouterLink>
    </p>
  </AuthLayout>
</template>

<style scoped>
.intro {
  margin-top: 6px;
}
.form {
  display: grid;
  gap: 18px;
  margin-top: 28px;
}
.alert {
  padding: 12px 14px;
  border-left: 4px solid var(--bunus-error-text);
  background: #fff;
  color: var(--bunus-error-text);
  font-weight: 500;
  border-radius: 4px;
}
.alt {
  margin-top: 24px;
}
</style>
