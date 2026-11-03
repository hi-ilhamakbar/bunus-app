<script setup lang="ts">
import { computed } from 'vue';
import { Check, Mail, MessageCircle, Smartphone } from 'lucide-vue-next';
import type { OtpChannel } from '../api/client';
import { copy } from '../copy';

defineProps<{ modelValue: OtpChannel; channels: readonly OtpChannel[]; legend: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: OtpChannel] }>();

const META = computed<Record<OtpChannel, { name: string; hint: string; icon: typeof Mail }>>(() => {
  const c = copy.register.steps.channel;
  return {
    email: { name: c.email, hint: c.emailHint, icon: Mail },
    whatsapp: { name: c.whatsapp, hint: c.phoneHint, icon: MessageCircle },
    sms: { name: c.sms, hint: c.phoneHint, icon: Smartphone },
  };
});
</script>

<template>
  <fieldset class="picker">
    <legend class="sr-only">{{ legend }}</legend>
    <label
      v-for="ch in channels"
      :key="ch"
      class="option"
      :class="{ on: modelValue === ch }"
    >
      <input
        type="radio"
        name="channel"
        class="sr-only"
        :value="ch"
        :checked="modelValue === ch"
        @change="emit('update:modelValue', ch)"
      />
      <component :is="META[ch].icon" :size="22" aria-hidden="true" />
      <span class="text">
        <span class="name">{{ META[ch].name }}</span>
        <span class="hint">{{ META[ch].hint }}</span>
      </span>
      <Check v-if="modelValue === ch" :size="20" :stroke-width="3" class="tick" aria-hidden="true" />
    </label>
  </fieldset>
</template>

<style scoped>
.picker {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
.option {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 64px;
  padding: 10px 16px;
  background: var(--bunus-white);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-input);
  cursor: pointer;
}
.option.on {
  border-color: var(--bunus-emerald-800);
  box-shadow: inset 0 0 0 1px var(--bunus-emerald-800);
  background: #f2fbf7;
}
.option:focus-within {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}
.text {
  display: grid;
  flex: 1;
}
.name {
  font-weight: 600;
}
.hint {
  font-size: 13px;
  color: var(--text-muted);
}
.tick {
  color: var(--bunus-emerald-800);
}
</style>
