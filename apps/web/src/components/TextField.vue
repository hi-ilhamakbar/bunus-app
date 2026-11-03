<script setup lang="ts">
import { computed, ref } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';

let counter = 0;

const props = defineProps<{
  modelValue: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  autocomplete?: string;
  inputmode?: 'text' | 'email' | 'tel' | 'numeric';
  hint?: string;
  error?: string;
  maxlength?: number;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const id = `field-${(counter += 1)}`;
const reveal = ref(false);
const isPassword = computed(() => props.type === 'password');
const describedBy = computed(() =>
  [props.error ? `${id}-error` : '', props.hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined,
);
</script>

<template>
  <div class="field">
    <label :for="id" class="label">{{ label }}</label>
    <div class="control" :class="{ invalid: !!error }">
      <input
        :id="id"
        :value="modelValue"
        :type="isPassword && reveal ? 'text' : (type ?? 'text')"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :maxlength="maxlength"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        autocapitalize="off"
        spellcheck="false"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="isPassword"
        type="button"
        class="reveal"
        :aria-pressed="reveal"
        :aria-label="reveal ? 'Hide password' : 'Show password'"
        @click="reveal = !reveal"
      >
        <EyeOff v-if="reveal" :size="20" aria-hidden="true" />
        <Eye v-else :size="20" aria-hidden="true" />
      </button>
    </div>
    <p v-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</p>
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
.control {
  display: flex;
  align-items: stretch;
  background: var(--bunus-white);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-input);
}
.control:focus-within {
  outline: 3px solid var(--focus);
  outline-offset: 1px;
}
.control.invalid {
  border-color: var(--bunus-error-text);
}
input {
  flex: 1;
  min-width: 0;
  min-height: var(--control-height);
  padding: 0 14px;
  border: 0;
  background: transparent;
  border-radius: var(--radius-input);
  font: inherit;
  color: var(--text);
}
input:focus {
  outline: none;
}
.reveal {
  display: grid;
  place-items: center;
  width: var(--control-height);
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-input);
}
.reveal:focus-visible {
  outline-offset: -3px;
}
.hint {
  font-size: 13px;
  color: var(--text-muted);
}
.error {
  font-size: 13px;
  font-weight: 500;
  color: var(--bunus-error-text);
}
</style>
