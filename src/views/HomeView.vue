<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchMilestones, type Milestone } from '@/api'
import {
  XP_PER_LEVEL,
  lessonState,
  level,
  levelProgress,
  previousLesson,
  resetProgress,
  resultFor,
  totalXp,
} from '@/progress'

const milestones = ref<Milestone[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const allLessons = computed(() => milestones.value.flatMap((milestone) => milestone.lessons))

const path = computed(() =>
  milestones.value.map((milestone) => {
    const lessons = [...milestone.lessons]
      .sort((a, b) => a.position - b.position)
      .map((lesson) => ({
        ...lesson,
        state: lessonState(lesson, allLessons.value),
        perfect: resultFor(lesson.id)?.accuracy === 100,
        previousTitle: previousLesson(lesson, allLessons.value)?.title,
      }))
    const done = lessons.filter((lesson) => lesson.state === 'completed').length
    return {
      ...milestone,
      lessons,
      done,
      locked: lessons.every((lesson) => lesson.state === 'locked'),
    }
  }),
)

const completedCount = computed(() => path.value.reduce((sum, milestone) => sum + milestone.done, 0))

// Level-Leiste aus 10 Splittern
const levelSegments = computed(() => {
  const filled = Math.round(levelProgress.value * 10)
  return Array.from({ length: 10 }, (_, i) => i < filled)
})
const xpToNextLevel = computed(() => XP_PER_LEVEL - (totalXp.value % XP_PER_LEVEL))

function confirmReset() {
  if (window.confirm('Gesamten Lernfortschritt zurücksetzen?')) {
    resetProgress()
  }
}

onMounted(async () => {
  try {
    milestones.value = await fetchMilestones()
  } catch {
    error.value = 'Lernpfad konnte nicht geladen werden. Läuft das Backend?'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <section class="hero">
    <p class="kicker hero-kicker">
      Level {{ level }} · Tiefe {{ completedCount }} / {{ allLessons.length || '…' }}
    </p>
    <h1>Grab dich durch den Stack.</h1>
    <p class="hero-text">
      Von den ersten Zeilen Java bis zur fertigen App: Jeder Meilenstein bringt dir genau das bei,
      was du für diesen Teil von Project RekSai brauchst.
    </p>
    <div class="level-bar" role="img" :aria-label="`Noch ${xpToNextLevel} XP bis Level ${level + 1}`">
      <span v-for="(filled, i) in levelSegments" :key="i" :class="{ filled }"></span>
    </div>
    <p class="level-caption">Noch {{ xpToNextLevel }} XP bis Level {{ level + 1 }}</p>
  </section>

  <div v-if="loading" class="state-message">
    <span class="spinner" aria-hidden="true"></span>
    <p>Lade Lernpfad …</p>
  </div>
  <p v-else-if="error" class="state-message error">{{ error }}</p>

  <section
    v-for="(milestone, milestoneIndex) in path"
    :key="milestone.number"
    class="milestone"
    :class="{ locked: milestone.locked }"
    :data-milestone="milestone.number"
    :style="{ '--delay': `${milestoneIndex * 80}ms` }"
  >
    <header class="milestone-header">
      <div class="milestone-top">
        <span class="tag milestone-tag">M{{ milestone.number }}</span>
        <p class="kicker milestone-kicker">
          Meilenstein {{ milestone.number }}
          <span v-if="!milestone.implemented" class="planned-chip">Geplant</span>
        </p>
        <span class="milestone-meta">{{ milestone.done }}/{{ milestone.lessons.length }}</span>
      </div>
      <h2 class="milestone-title">{{ milestone.title }}</h2>
      <p class="milestone-goal">{{ milestone.goal }}</p>
      <div class="milestone-segments" aria-hidden="true">
        <span v-for="lesson in milestone.lessons" :key="lesson.id" :class="lesson.state"></span>
      </div>
    </header>

    <ol class="path">
      <li v-for="lesson in milestone.lessons" :key="lesson.id" class="node-row" :class="lesson.state">
        <RouterLink
          v-if="lesson.state !== 'locked'"
          :to="{ name: 'lesson', params: { id: lesson.id } }"
          class="node"
          :aria-label="`Lektion ${milestone.number}.${lesson.position}: ${lesson.title}`"
        >
          <span class="hex">
            <span class="hex-inner">
              <template v-if="lesson.state === 'completed'">{{ lesson.perfect ? '★' : '✓' }}</template>
              <template v-else>{{ milestone.number }}.{{ lesson.position }}</template>
            </span>
          </span>
        </RouterLink>
        <span
          v-else
          class="node"
          role="img"
          :aria-label="`Lektion ${milestone.number}.${lesson.position}: ${lesson.title}, gesperrt`"
          :title="`Schließe zuerst „${lesson.previousTitle}“ ab`"
        >
          <span class="hex">
            <span class="hex-inner">{{ milestone.number }}.{{ lesson.position }}</span>
          </span>
        </span>

        <span class="node-label">
          <strong>{{ lesson.title }}</strong>
          <span v-if="lesson.state === 'locked'" class="node-sub">Versiegelt</span>
          <span v-else-if="lesson.state === 'completed'" class="node-sub done">Geschafft</span>
          <span v-else class="node-sub now">Jetzt · +{{ lesson.totalXp }} XP</span>
        </span>
      </li>
    </ol>
  </section>

  <section v-if="milestones.some((m) => !m.implemented)" class="coming-soon">
    <p class="kicker coming-kicker">Geplante Meilensteine</p>
    <p>
      Meilensteine mit „Geplant“ kannst du schon lernen. Im Code von Project RekSai werden sie als
      Nächstes gebaut.
    </p>
  </section>

  <p v-if="completedCount > 0" class="reset">
    <button type="button" class="reset-button" @click="confirmReset">Fortschritt zurücksetzen</button>
  </p>
</template>

<style scoped>
/* Kopfbereich: Indigo-Kristall mit abgeschnittenen Ecken */
.hero {
  display: grid;
  gap: 0.6rem;
  margin-bottom: 2.25rem;
  padding: 1.5rem 1.4rem 1.3rem;
  clip-path: polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 28px 100%, 0 calc(100% - 28px));
  background: #272f7a;
  color: #e6e8ff;
}

.hero-kicker {
  color: #6febe3;
}

.hero h1 {
  color: #ffffff;
  font-size: clamp(1.6rem, 5vw, 2.3rem);
}

.hero-text {
  max-width: 34rem;
  color: rgb(230 232 255 / 80%);
}

.level-bar {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 5px;
  margin-top: 0.5rem;
}

.level-bar span {
  height: 0.55rem;
  transform: skewX(-20deg);
  background: rgb(255 255 255 / 14%);
  transition: background-color 0.3s;
}

.level-bar span.filled {
  background: #e04fd6;
}

.level-caption {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: rgb(230 232 255 / 70%);
}

/* Meilensteine */
.milestone {
  --ms-color: var(--brand);
  margin-bottom: 2.75rem;
  animation: rise 0.45s var(--ease-out) both;
  animation-delay: var(--delay);
}

.milestone[data-milestone='1'] {
  --ms-color: #f06a3c;
}

.milestone[data-milestone='2'] {
  --ms-color: #2fbf7f;
}

.milestone[data-milestone='3'] {
  --ms-color: #e04fd6;
}

.milestone[data-milestone='4'] {
  --ms-color: #4a9bf0;
}

.milestone[data-milestone='5'] {
  --ms-color: #3fe0d6;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

.milestone-header {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 1.5rem;
  padding: 1rem 1.1rem 1.1rem;
  clip-path: var(--shape-card);
  background: var(--color-surface);
}

.milestone-top {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.milestone-tag {
  background: var(--ms-color);
  color: #0a0b1c;
}

.milestone-kicker {
  flex: 1;
  color: var(--color-text-muted);
}

.planned-chip {
  margin-left: 0.4rem;
  padding: 0.05rem 0.45rem;
  border: 1px dashed currentColor;
  letter-spacing: 0.08em;
}

.milestone-meta {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.milestone-title {
  font-size: 1.4rem;
}

.milestone-goal {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

.milestone-segments {
  display: flex;
  gap: 4px;
  margin-top: 0.5rem;
}

.milestone-segments span {
  flex: 1;
  height: 0.4rem;
  transform: skewX(-20deg);
  background: var(--color-locked-bg);
}

.milestone-segments span.completed {
  background: var(--crystal);
}

.milestone-segments span.current {
  background: var(--glow);
}

.milestone.locked .milestone-tag {
  background: var(--color-locked-bg);
  color: var(--color-locked-text);
}

.milestone.locked .milestone-title {
  color: var(--color-text-muted);
}

/* Lernpfad als Wabe: drei Spalten, die mittlere versetzt */
.path {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.1rem 0.75rem;
}

.node-row {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 0.5rem;
  text-align: center;
}

.node-row:nth-child(3n + 2) {
  margin-top: 2.6rem;
}

.node {
  display: block;
}

.hex {
  display: grid;
  place-items: center;
  width: 5.4rem;
  height: 4.7rem;
  clip-path: var(--shape-hex);
  transition:
    transform 0.15s var(--ease-out),
    filter 0.15s;
}

.hex-inner {
  display: grid;
  place-items: center;
  width: calc(100% - 8px);
  height: calc(100% - 8px);
  clip-path: var(--shape-hex);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 1.05rem;
}

a.node:hover .hex {
  transform: translateY(-3px);
  filter: brightness(1.1);
}

.completed .hex,
.completed .hex-inner {
  background: var(--crystal);
  color: #ffffff;
  font-size: 1.4rem;
}

.current .hex {
  background: var(--glow);
}

.current .hex-inner {
  background: var(--color-surface);
  color: var(--glow-text);
}

.locked .hex,
.locked .hex-inner {
  background: var(--color-locked-bg);
  color: var(--color-locked-text);
  cursor: not-allowed;
}

.node-label {
  display: grid;
  gap: 0.15rem;
  line-height: 1.25;
}

.node-label strong {
  color: var(--color-heading);
  font-size: 0.85rem;
}

.locked .node-label strong {
  color: var(--color-locked-text);
  font-weight: 500;
}

.node-sub {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-locked-text);
}

.node-sub.done {
  color: var(--crystal-text);
}

.node-sub.now {
  color: var(--glow-text);
  font-weight: 700;
}

.coming-soon {
  margin-bottom: 2rem;
  padding: 1rem 1.2rem;
  border: 1px dashed var(--color-border-strong);
  color: var(--color-text-muted);
}

.coming-kicker {
  margin-bottom: 0.3rem;
  color: var(--glow-text);
}

.reset {
  text-align: center;
}

.reset-button {
  border: none;
  background: none;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  text-decoration: underline;
  cursor: pointer;
}

.reset-button:hover {
  color: var(--color-error-text);
}

@media (max-width: 420px) {
  .hex {
    width: 4.6rem;
    height: 4rem;
  }
}
</style>
