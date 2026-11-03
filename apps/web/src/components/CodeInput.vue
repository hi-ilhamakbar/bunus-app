<script setup lang="ts">
import { computed } from 'vue';

let counter = 0;

const props = defineProps<{ modelValue: string; label: string; error?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const id = `code-${(counter += 1)}`;
const describedBy = computed(() => (props.error ? `${id}-error` : undefined));

function onInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  // Digits only. Pasting "123 456" from a message works.
  const digits = input.value.replace(/\D/g, '').slice(0, 8);
  input.value = digits;
  emit('update:modelValue', digits);
}
</script>

<template>
  <div class="field">
    <label :for="id" class="label">{{ label }}</label>
    <input
      :id="id"
      class="num"
      :value="modelValue"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      pattern="[0-9]*"
      maxlength="12"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      spellcheck="false"
      @input="onInput"
    />
    <p v-if="error" :id="`${id}-error`" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.field {
  display: grid;
  gap: 6px;
}
.label {
  font-size: 14px;
  font-weight: 600;
}
input {
  min-height: 60px;
  padding: 0 16px;
  background: var(--bunus-white);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-input);
  font-family: var(--font-body);
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.35em;
  color: var(--text);
}
input[aria-invalid='true'] {
  border-color: var(--bunus-error-text);
}
.error {
  font-size: 13px;
  font-weight: 500;
  color: var(--bunus-error-text);
}
</style>
