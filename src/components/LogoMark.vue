<script setup lang="ts">
import { useId } from 'vue'

// Drei Kristallkrallen, gleiche Form wie public/favicon.svg, aber ohne Hintergrund
withDefaults(defineProps<{ size?: number }>(), { size: 40 })

const id = useId()
</script>

<template>
  <svg :width="size" :height="size" viewBox="4 4 56 56" aria-hidden="true">
    <defs>
      <linearGradient :id="`${id}-shard`" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#6d12a8" />
        <stop offset=".55" stop-color="#cf2ac6" />
        <stop offset="1" stop-color="#ff86e4" />
      </linearGradient>
      <g :id="`${id}-claw`">
        <path :fill="`url(#${id}-shard)`" d="M-6 0L-7.5-17L-3.5-32L8-44L6-30L6.5-14L6 0Z" />
        <path fill="#ffd0f5" fill-opacity=".55" d="M-6 0L-7.5-17L-3.5-32L8-44L0-29L-0.5-13L0 0Z" />
        <path
          fill="none"
          stroke="#4fe3dc"
          stroke-width="1.4"
          stroke-linejoin="round"
          stroke-opacity=".85"
          d="M8-44L6-30L6.5-14L6 0"
        />
        <rect x="-7.5" y="-1" width="15" height="7" rx="3.5" fill="#6b7099" />
        <rect x="-7.5" y="-1" width="15" height="3" rx="1.5" fill="#a3a8cc" />
      </g>
    </defs>
    <use :href="`#${id}-claw`" transform="translate(16 52) rotate(-14) scale(.78)" />
    <use :href="`#${id}-claw`" transform="translate(31 50) rotate(-2) scale(.95)" />
    <use :href="`#${id}-claw`" transform="translate(47 51) rotate(10) scale(.8)" />
  </svg>
</template>
