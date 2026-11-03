<script setup lang="ts">
// Same drawing as public/favicon.svg. Temporary until the vector logo from the brand team replaces it.
defineProps<{ size?: number }>();
</script>

<template>
  <svg
    :width="size ?? 36"
    :height="size ?? 36"
    viewBox="0 0 512 512"
    aria-hidden="true"
    focusable="false"
  >
    <rect width="512" height="512" rx="116" fill="#0B6B4F" />
    <g>
      <ellipse cx="190" cy="176" rx="36" ry="98" transform="rotate(-9 190 176)" fill="#F3F4F6" />
      <ellipse cx="322" cy="176" rx="36" ry="98" transform="rotate(9 322 176)" fill="#F3F4F6" />
      <ellipse cx="256" cy="486" rx="168" ry="104" fill="#F3F4F6" />
      <ellipse cx="256" cy="326" rx="124" ry="108" fill="#F3F4F6" />
    </g>
    <circle cx="214" cy="322" r="14" fill="#111827" />
    <circle cx="298" cy="322" r="14" fill="#111827" />
    <path d="M240 356h32l-16 17z" fill="#111827" stroke="#111827" stroke-width="8" stroke-linejoin="round" />
    <path
      d="M232 384q12 14 24 0q12 14 24 0"
      fill="none"
      stroke="#111827"
      stroke-width="8"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <g stroke="#FBBF24" stroke-width="16" stroke-linecap="round">
      <path d="M396 70l18 -30" />
      <path d="M426 96l34 -12" />
      <path d="M420 134l30 14" />
    </g>
  </svg>
</template>
