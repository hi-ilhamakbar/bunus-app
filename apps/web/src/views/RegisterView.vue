<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ApiError,
  authApi,
  type OtpChannel,
  type SignupChallenge,
} from '../api/client';
import AuthLayout from '../components/AuthLayout.vue';
import ChannelPicker from '../components/ChannelPicker.vue';
import CodeInput from '../components/CodeInput.vue';
import StampCard from '../components/StampCard.vue';
import TextField from '../components/TextField.vue';
import { copy, fill } from '../copy';
import { session } from '../stores/session';

type Step = 'details' | 'channel' | 'code' | 'done';

const router = useRouter();
const t = copy.register.steps;

const step = ref<Step>('details');
const channels = ref<OtpChannel[]>(['email']);
const form = reactive({
  displayName: '',
  email: '',
  password: '',
  phone: '',
  channel: 'email' as OtpChannel,
  code: '',
});
const errors = reactive<Record<string, string>>({});
const formError = ref('');
const busy = ref(false);
const challenge = ref<SignupChallenge | null>(null);
const resendsLeft = ref(0);
const resendAt = ref(0);
const now = ref(Date.now());
const heading = ref<HTMLElement | null>(null);

// How many slots carry a stamp. Each is set only after the step it stands for has really happened.
const filled = ref(0);

let timer: number | undefined;
onMounted(async () => {
  timer = window.setInterval(() => (now.value = Date.now()), 1000);
  try {
    const { channels: enabled } = await authApi.channels();
    if (enabled.length) {
      channels.value = enabled;
      if (!enabled.includes(form.channel)) form.channel = enabled[0] as OtpChannel;
    }
  } catch {
    // Keep email as the safe default; the real error shows when they try to send.
  }
});
onBeforeUnmount(() => window.clearInterval(timer));

const needsPhone = computed(() => form.channel !== 'email');
const secondsLeft = computed(() => Math.max(0, Math.ceil((resendAt.value - now.value) / 1000)));
const canResend = computed(() => secondsLeft.value === 0 && resendsLeft.value > 0 && !busy.value);
const showNoCodeHelp = computed(() => step.value === 'code' && secondsLeft.value === 0);

function clearErrors(): void {
  for (const key of Object.keys(errors)) delete errors[key];
  formError.value = '';
}

async function go(next: Step): Promise<void> {
  step.value = next;
  await nextTick();
  heading.value?.focus();
}

function applyApiError(err: unknown): void {
  if (!(err instanceof ApiError)) {
    formError.value = copy.errors.generic;
    return;
  }
  Object.assign(errors, err.fieldErrors());
  if (err.code === 'OTP_COOLDOWN') {
    const wait = Number(err.details?.retryAfterSeconds ?? 0);
    if (wait > 0) resendAt.value = Date.now() + wait * 1000;
  }
  // Field errors alone are enough when the API sent them; otherwise show its message.
  if (!Object.keys(err.fieldErrors()).length || err.code === 'OTP_UNAVAILABLE') {
    formError.value = err.message;
  }
}

// -- step 1: details (checked here; the server checks again) ---------------------------------

async function submitDetails(): Promise<void> {
  clearErrors();
  if (!form.displayName.trim()) errors.displayName = copy.errors.nameRequired;
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = copy.errors.emailInvalid;
  if (form.password.length < 8) errors.password = copy.errors.passwordShort;
  if (Object.keys(errors).length) return;
  filled.value = Math.max(filled.value, 1);
  await go('channel');
}

// -- step 2: pick a channel, send the code ---------------------------------------------------

async function sendCode(): Promise<void> {
  clearErrors();
  if (needsPhone.value && !form.phone.trim()) {
    errors.phone = copy.errors.phoneRequired;
    return;
  }
  busy.value = true;
  try {
    const result = await authApi.start({
      displayName: form.displayName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: needsPhone.value ? form.phone.trim() : undefined,
      channel: form.channel,
    });
    challenge.value = result;
    resendsLeft.value = result.resendsLeft;
    resendAt.value = new Date(result.resendAvailableAt).getTime();
    form.code = '';
    filled.value = Math.max(filled.value, 2);
    await go('code');
  } catch (err) {
    applyApiError(err);
    // A bad name/email/password found by the server belongs on the first step.
    if (err instanceof ApiError && (errors.displayName || errors.email || errors.password)) {
      await go('details');
    }
  } finally {
    busy.value = false;
  }
}

// -- step 3: the code --------------------------------------------------------------------------

async function submitCode(): Promise<void> {
  clearErrors();
  if (!/^\d{4,8}$/.test(form.code)) {
    errors.code = copy.errors.codeFormat;
    return;
  }
  if (!challenge.value) return;
  busy.value = true;
  try {
    const { customer } = await authApi.verify(challenge.value.signupId, form.code);
    session.setCustomer(customer);
    filled.value = 3;
    // The reward stamp lands a beat after the code stamp.
    window.setTimeout(() => (filled.value = 4), 650);
    await go('done');
  } catch (err) {
    applyApiError(err);
    if (err instanceof ApiError && err.code === 'CODE_INVALID') {
      errors.code = err.message;
      formError.value = '';
    }
  } finally {
    busy.value = false;
  }
}

async function resend(): Promise<void> {
  if (!challenge.value || !canResend.value) return;
  clearErrors();
  busy.value = true;
  try {
    const result = await authApi.resend(challenge.value.signupId);
    resendsLeft.value = result.resendsLeft;
    resendAt.value = new Date(result.resendAvailableAt).getTime();
    form.code = '';
  } catch (err) {
    applyApiError(err);
  } finally {
    busy.value = false;
  }
}

async function changeWay(): Promise<void> {
  clearErrors();
  form.code = '';
  filled.value = 1;
  await go('channel');
}

async function startOver(): Promise<void> {
  clearErrors();
  challenge.value = null;
  form.code = '';
  filled.value = 0;
  await go('details');
}

const finished = computed(() => step.value === 'done');
</script>

<template>
  <AuthLayout>
    <template #card>
      <StampCard
        :labels="copy.register.slotLabels"
        :filled="filled"
        :columns="4"
        notch="var(--bunus-emerald-800)"
      />
    </template>

    <!-- 1. details -->
    <section v-if="step === 'details'" aria-labelledby="h-details">
      <h1 id="h-details" ref="heading" tabindex="-1">{{ copy.register.title }}</h1>
      <p class="muted intro">{{ t.details.body }}</p>
      <form class="form" novalidate @submit.prevent="submitDetails">
        <p v-if="formError" class="alert" role="alert">{{ formError }}</p>
        <TextField
          v-model="form.displayName"
          :label="t.details.name"
          autocomplete="name"
          :error="errors.displayName"
        />
        <TextField
          v-model="form.email"
          :label="t.details.email"
          type="email"
          autocomplete="email"
          inputmode="email"
          :error="errors.email"
        />
        <TextField
          v-model="form.password"
          :label="t.details.password"
          type="password"
          autocomplete="new-password"
          :hint="t.details.passwordHint"
          :error="errors.password"
        />
        <button class="btn btn-primary btn-block" type="submit">{{ t.details.next }}</button>
      </form>
      <p class="alt muted">
        {{ copy.register.haveAccount }}
        <RouterLink to="/member/login">{{ copy.register.login }}</RouterLink>
      </p>
    </section>

    <!-- 2. channel -->
    <section v-else-if="step === 'channel'" aria-labelledby="h-channel">
      <h1 id="h-channel" ref="heading" tabindex="-1">{{ t.channel.heading }}</h1>
      <p class="muted intro">{{ t.channel.body }}</p>
      <form class="form" novalidate @submit.prevent="sendCode">
        <p v-if="formError" class="alert" role="alert">{{ formError }}</p>
        <ChannelPicker v-model="form.channel" :channels="channels" :legend="t.channel.heading" />
        <TextField
          v-if="needsPhone"
          v-model="form.phone"
          :label="t.channel.phone"
          type="tel"
          autocomplete="tel"
          inputmode="tel"
          :hint="t.channel.phoneHelp"
          :error="errors.phone"
        />
        <div class="row">
          <button type="button" class="btn btn-outline" :disabled="busy" @click="go('details')">
            {{ t.channel.back }}
          </button>
          <button class="btn btn-primary grow" type="submit" :disabled="busy">{{ t.channel.send }}</button>
        </div>
      </form>
    </section>

    <!-- 3. code -->
    <section v-else-if="step === 'code' && challenge" aria-labelledby="h-code">
      <h1 id="h-code" ref="heading" tabindex="-1">{{ t.code.heading }}</h1>
      <p class="muted intro">
        {{ fill(t.code.body, { where: challenge.destinationMasked }) }}
      </p>
      <form class="form" novalidate @submit.prevent="submitCode">
        <p v-if="formError" class="alert" role="alert">{{ formError }}</p>
        <CodeInput v-model="form.code" :label="t.code.label" :error="errors.code" />
        <button class="btn btn-primary btn-block" type="submit" :disabled="busy">{{ t.code.submit }}</button>
      </form>

      <div class="after" aria-live="polite">
        <p v-if="resendsLeft === 0" class="muted">{{ t.code.noResends }}</p>
        <p v-else-if="secondsLeft > 0" class="muted num">
          {{ fill(t.code.resendIn, { s: secondsLeft }) }}
        </p>
        <template v-else>
          <p>
            <button type="button" class="btn-text" :disabled="!canResend" @click="resend">
              {{ t.code.resend }}
            </button>
          </p>
          <p class="muted num">{{ fill(t.code.resendsLeft, { n: resendsLeft }) }}</p>
        </template>
        <p v-if="showNoCodeHelp" class="muted">
          {{ t.code.noCodeHelp }}
          <RouterLink to="/member/login">{{ t.code.loginInstead }}</RouterLink>
        </p>
        <p class="links">
          <button type="button" class="btn-text" @click="changeWay">{{ t.code.changeWay }}</button>
          <button type="button" class="btn-text" @click="startOver">{{ t.code.startOver }}</button>
        </p>
      </div>
    </section>

    <!-- 4. done -->
    <section v-else-if="finished" aria-labelledby="h-done">
      <h1 id="h-done" ref="heading" tabindex="-1">
        {{ fill(t.done.heading, { name: form.displayName.trim().split(/\s+/)[0] ?? '' }) }}
      </h1>
      <p class="muted intro">{{ t.done.body }}</p>
      <div class="form">
        <button type="button" class="btn btn-primary btn-block" @click="router.replace('/member')">
          {{ t.done.go }}
        </button>
      </div>
    </section>
  </AuthLayout>
</template>

<style scoped>
h1:focus {
  outline: none;
}
.intro {
  margin-top: 6px;
}
.form {
  display: grid;
  gap: 18px;
  margin-top: 28px;
}
.row {
  display: flex;
  gap: 12px;
}
.grow {
  flex: 1;
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
.after {
  display: grid;
  gap: 10px;
  margin-top: 24px;
  font-size: 14px;
}
.links {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
</style>
