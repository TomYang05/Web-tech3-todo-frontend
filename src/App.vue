<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import LogoMark from '@/components/LogoMark.vue'
import { level, totalXp } from '@/progress'
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <RouterLink to="/" class="brand" aria-label="Project RekSai, zur Startseite">
        <LogoMark :size="38" class="brand-mark" />
        <span class="brand-name">
          <span class="brand-project">Project</span>
          <span class="brand-title">RekSai</span>
        </span>
      </RouterLink>
      <div class="topbar-right">
        <span class="level" title="Dein Level">Lvl {{ level }}</span>
        <span :key="totalXp" class="xp-chip" title="Deine gesammelten XP">
          <span class="xp-gem" aria-hidden="true"></span>{{ totalXp }}
          <span class="visually-hidden">XP</span>
        </span>
      </div>
    </div>
  </header>

  <main class="page">
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>
  </main>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--color-background) 88%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
}

.topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 760px;
  margin: 0 auto;
  padding: 0.7rem 1rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-mark {
  flex: none;
  transition: transform 0.2s var(--ease-out);
}

.brand:hover .brand-mark {
  transform: rotate(-6deg) scale(1.06);
}

.brand-name {
  display: grid;
  line-height: 1;
}

.brand-project {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--glow-text);
}

.brand-title {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-heading);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.level {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.xp-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 1rem 0.35rem 0.9rem;
  clip-path: var(--shape-slant);
  background: var(--color-surface-2);
  color: var(--color-heading);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.9rem;
  animation: chip-pop 0.4s var(--ease-out);
}

.xp-gem {
  width: 0.6rem;
  height: 0.6rem;
  background: var(--crystal);
  transform: rotate(45deg);
}

@keyframes chip-pop {
  40% {
    transform: scale(1.12);
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 1.25rem 1rem 4rem;
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.2s,
    transform 0.25s var(--ease-out);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
}
</style>
