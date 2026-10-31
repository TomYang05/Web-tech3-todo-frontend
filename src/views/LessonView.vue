<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import ReadingCard from '@/components/ReadingCard.vue'
import TaskCard from '@/components/TaskCard.vue'
import {
  checkAnswer,
  fetchLesson,
  fetchLessons,
  type CheckResult,
  type LessonDetail,
  type LessonSummary,
} from '@/api'
import { PASS_ACCURACY, lessonState, nextLesson, previousLesson, recordResult } from '@/progress'

const props = defineProps<{ id: number }>()

// Jede Lektion läuft in dieser Reihenfolge: Lektion → Lesen → Lernen → Anwenden
type Phase = 'intro' | 'read' | 'task' | 'done'

const lesson = ref<LessonDetail | null>(null)
const allLessons = ref<LessonSummary[]>([])
const error = ref<string | null>(null)
const phase = ref<Phase>('intro')
const readIndex = ref(0)
const taskIndex = ref(0)
const result = ref<CheckResult | null>(null)
const busy = ref(false)
const earnedXp = ref(0)
const correctCount = ref(0)
const passed = ref(false)
const startButton = ref<HTMLButtonElement | null>(null)

const readings = computed(() => lesson.value?.readings ?? [])
const tasks = computed(() => lesson.value?.tasks ?? [])
const learnCount = computed(() => tasks.value.filter((t) => t.type === 'MULTIPLE_CHOICE').length)
const applyCount = computed(() => tasks.value.length - learnCount.value)
const totalXp = computed(() => tasks.value.reduce((sum, t) => sum + t.xp, 0))
const lessonLabel = computed(() =>
  lesson.value ? `${lesson.value.milestone}.${lesson.value.position} · ${lesson.value.title}` : '',
)

const currentReading = computed(() =>
  phase.value === 'read' ? readings.value[readIndex.value] : undefined,
)
const currentTask = computed(() =>
  phase.value === 'task' ? tasks.value[taskIndex.value] : undefined,
)

const activeStep = computed(() => {
  if (phase.value === 'intro') return 0
  if (phase.value === 'read') return 1
  if (phase.value === 'task') return currentTask.value?.type === 'INPUT' ? 3 : 2
  return 4
})

// Ein Kristall-Splitter pro Phase, der aktive füllt sich mit dem Fortschritt in der Phase
const steps = computed(() => {
  const answered = taskIndex.value + (result.value ? 1 : 0)
  const inPhase = [
    1,
    readings.value.length ? (readIndex.value + 1) / readings.value.length : 1,
    learnCount.value ? Math.min(answered, learnCount.value) / learnCount.value : 1,
    applyCount.value ? Math.max(answered - learnCount.value, 0) / applyCount.value : 1,
  ]
  // Zähler für die aktive Phase, z. B. "2/3"
  const counters = [
    '',
    `${readIndex.value + 1}/${readings.value.length}`,
    `${taskIndex.value + 1}/${learnCount.value}`,
    `${taskIndex.value - learnCount.value + 1}/${applyCount.value}`,
  ]
  return ['Lektion', 'Lesen', 'Lernen', 'Anwenden'].map((label, i) => ({
    label,
    detail: i === activeStep.value ? counters[i] : '',
    state: i < activeStep.value ? 'done' : i === activeStep.value ? 'active' : 'todo',
    fill: i < activeStep.value ? 1 : i === activeStep.value ? inPhase[i]! : 0,
  }))
})

const accuracy = computed(() =>
  tasks.value.length === 0 ? 0 : Math.round((correctCount.value / tasks.value.length) * 100),
)
const summaryTitle = computed(() => {
  if (!passed.value) return 'Fast geschafft!'
  if (accuracy.value === 100) return 'Perfekt!'
  return 'Lektion geschafft!'
})

// Gesperrt, solange die vorige Lektion im Lernpfad nicht bestanden ist
const locked = computed(
  () => lesson.value !== null && lessonState(lesson.value, allLessons.value) === 'locked',
)
const previous = computed(() => lesson.value && previousLesson(lesson.value, allLessons.value))
const next = computed(() => lesson.value && nextLesson(lesson.value, allLessons.value))
const milestoneDone = computed(() => !next.value || next.value.milestone !== lesson.value?.milestone)

function restart() {
  phase.value = 'intro'
  readIndex.value = 0
  taskIndex.value = 0
  result.value = null
  earnedXp.value = 0
  correctCount.value = 0
  passed.value = false
}

function start() {
  phase.value = readings.value.length ? 'read' : 'task'
}

function nextReading() {
  if (readIndex.value + 1 < readings.value.length) {
    readIndex.value++
  } else {
    phase.value = tasks.value.length ? 'task' : 'done'
  }
}

function previousReading() {
  readIndex.value = Math.max(0, readIndex.value - 1)
}

async function submit(answer: string) {
  if (!currentTask.value) return
  busy.value = true
  try {
    result.value = await checkAnswer(currentTask.value.id, answer)
    if (result.value.correct) {
      earnedXp.value += result.value.xp
      correctCount.value++
    }
  } catch {
    error.value = 'Antwort konnte nicht geprüft werden.'
  } finally {
    busy.value = false
  }
}

function nextTask() {
  result.value = null
  if (taskIndex.value + 1 < tasks.value.length) {
    taskIndex.value++
  } else {
    phase.value = 'done'
  }
}

async function load(id: number) {
  lesson.value = null
  error.value = null
  restart()
  try {
    const [detail, summaries] = await Promise.all([fetchLesson(id), fetchLessons()])
    allLessons.value = summaries
    lesson.value = detail
  } catch {
    error.value = 'Lektion konnte nicht geladen werden.'
  }
}

watch(phase, (value) => {
  if (value === 'done' && lesson.value) {
    passed.value = recordResult(lesson.value.id, earnedXp.value, accuracy.value)
  }
})

// Start-Button fokussieren, damit Enter direkt loslegt
watch(startButton, (button) => button?.focus())

watch(() => props.id, load)
onMounted(() => load(props.id))
</script>

<template>
  <div>
    <p v-if="error" class="state-message error">{{ error }}</p>
    <div v-else-if="!lesson" class="state-message">
      <span class="spinner" aria-hidden="true"></span>
      <p>Lade Lektion …</p>
    </div>

    <section v-else-if="locked" class="summary">
      <div class="gem locked-gem" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="40" height="40">
          <path
            fill="currentColor"
            d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"
          />
        </svg>
      </div>
      <h2>Noch versiegelt</h2>
      <p class="summary-detail">
        Schließe zuerst „{{ previous?.title }}“ ab, um {{ lesson.title }} freizuschalten.
      </p>
      <div class="summary-actions">
        <RouterLink to="/" class="btn btn-ghost">Zur Übersicht</RouterLink>
        <RouterLink v-if="previous" :to="{ name: 'lesson', params: { id: previous.id } }" class="btn">
          Zu „{{ previous.title }}“
        </RouterLink>
      </div>
    </section>

    <template v-else>
      <div class="lesson-header">
        <RouterLink to="/" class="close" aria-label="Zur Übersicht">✕</RouterLink>
        <ol class="stepper" aria-label="Ablauf der Lektion">
          <li
            v-for="step in steps"
            :key="step.label"
            :class="step.state"
            :aria-current="step.state === 'active' ? 'step' : undefined"
          >
            <span class="shard" aria-hidden="true">
              <span class="shard-fill" :style="{ width: `${step.fill * 100}%` }"></span>
            </span>
            <span class="step-label">{{ step.label }} <span class="step-detail">{{ step.detail }}</span></span>
          </li>
        </ol>
        <span :key="earnedXp" class="xp"><span class="xp-gem" aria-hidden="true"></span>{{ earnedXp }}</span>
      </div>

      <Transition name="task" mode="out-in">
        <section v-if="phase === 'intro'" key="intro" class="intro">
          <p class="intro-milestone">
            <span class="tag milestone-tag">M{{ lesson.milestone }}</span>
            {{ lesson.milestoneTitle }}
          </p>
          <p class="kicker intro-number">Lektion {{ lesson.milestone }}.{{ lesson.position }}</p>
          <h1 class="intro-title">{{ lesson.title }}</h1>
          <p class="intro-goal"><span class="kicker">Ziel</span> {{ lesson.goal }}</p>
          <p v-if="!lesson.milestoneImplemented" class="intro-planned">
            Dieser Meilenstein ist im Projekt noch geplant. Du lernst hier schon, wie er gebaut wird.
          </p>

          <ul class="intro-phases">
            <li>
              <span class="phase-mark read" aria-hidden="true">01</span>
              <span>
                <strong>Lesen</strong>
                {{ readings.length }} {{ readings.length === 1 ? 'kurzer Text' : 'kurze Texte' }}
              </span>
            </li>
            <li>
              <span class="phase-mark learn" aria-hidden="true">02</span>
              <span>
                <strong>Lernen</strong> {{ learnCount }} {{ learnCount === 1 ? 'Frage' : 'Fragen' }}
              </span>
            </li>
            <li>
              <span class="phase-mark apply" aria-hidden="true">03</span>
              <span>
                <strong>Anwenden</strong>
                {{ applyCount }} {{ applyCount === 1 ? 'Aufgabe' : 'Aufgaben' }} zum Selbstschreiben
              </span>
            </li>
          </ul>

          <div class="intro-actions">
            <span class="intro-xp">bis zu +{{ totalXp }} XP</span>
            <button ref="startButton" type="button" class="btn" @click="start">Los geht's</button>
          </div>
        </section>

        <ReadingCard
          v-else-if="currentReading"
          :key="`read-${readIndex}`"
          :reading="currentReading"
          :index="readIndex"
          :total="readings.length"
          :context="lessonLabel"
          @next="nextReading"
          @back="previousReading"
        />

        <TaskCard
          v-else-if="currentTask"
          :key="currentTask.id"
          :task="currentTask"
          :result="result"
          :busy="busy"
          @submit="submit"
          @next="nextTask"
        />

        <section v-else-if="phase === 'done'" key="done" class="summary">
          <div class="gem" :class="{ 'locked-gem': !passed }" aria-hidden="true">
            {{ !passed ? '↻' : accuracy === 100 ? '★' : '✓' }}
          </div>
          <h2>{{ summaryTitle }}</h2>
          <div class="summary-stats">
            <div class="stat stat-xp">
              <span class="kicker stat-label">XP verdient</span>
              <span class="stat-value">+{{ earnedXp }}</span>
            </div>
            <div class="stat stat-acc">
              <span class="kicker stat-label">Genauigkeit</span>
              <span class="stat-value">{{ accuracy }}%</span>
            </div>
          </div>
          <p class="summary-detail">{{ correctCount }} von {{ tasks.length }} Aufgaben richtig</p>
          <p v-if="!passed" class="unlock-hint">
            Du brauchst mindestens {{ PASS_ACCURACY }}% richtige Antworten, um die nächste Lektion
            freizuschalten.
          </p>
          <p v-else-if="next && milestoneDone" class="unlock-hint unlocked">
            Meilenstein {{ lesson.milestone }} geschafft! Weiter geht's mit Meilenstein
            {{ next.milestone }}.
          </p>
          <p v-else-if="next" class="unlock-hint unlocked">
            Freigeschaltet: <strong>{{ next.title }}</strong>
          </p>
          <p v-else class="unlock-hint unlocked">Du hast den ganzen Lernpfad geschafft!</p>

          <div v-if="!passed" class="summary-actions">
            <RouterLink to="/" class="btn btn-ghost">Zur Übersicht</RouterLink>
            <button type="button" class="btn" @click="restart">Nochmal versuchen</button>
          </div>
          <div v-else class="summary-actions">
            <button type="button" class="btn btn-ghost" @click="restart">Wiederholen</button>
            <RouterLink v-if="next" :to="{ name: 'lesson', params: { id: next.id } }" class="btn">
              Weiter
            </RouterLink>
            <RouterLink v-else to="/" class="btn">Zur Übersicht</RouterLink>
          </div>
        </section>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.lesson-header {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  margin-bottom: 1.75rem;
}

.close {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  margin-top: -0.4rem;
  color: var(--color-text-muted);
  font-size: 1.1rem;
}

.close:hover {
  color: var(--color-heading);
}

/* Ablauf als vier Kristall-Splitter: Lektion → Lesen → Lernen → Anwenden */
.stepper {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 0;
  list-style: none;
}

.stepper li {
  display: grid;
  gap: 0.4rem;
  min-width: 0;
}

.shard {
  position: relative;
  display: block;
  height: 0.65rem;
  clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
  background: var(--color-locked-bg);
  overflow: hidden;
}

.shard-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--glow);
  transition: width 0.4s var(--ease-out);
}

.stepper li.done .shard-fill {
  background: var(--crystal);
}

.step-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-locked-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stepper li.active .step-label {
  color: var(--glow-text);
}

.stepper li.done .step-label {
  color: var(--crystal-text);
}

.xp {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: -0.2rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-heading);
  animation: pop 0.35s var(--ease-out);
}

.xp-gem {
  width: 0.6rem;
  height: 0.6rem;
  background: var(--crystal);
  transform: rotate(45deg);
}

@keyframes pop {
  40% {
    transform: scale(1.2);
  }
}

/* Intro */
.intro {
  display: grid;
  gap: 1rem;
  padding: 1.5rem 1.3rem;
  clip-path: var(--shape-card);
  background: var(--color-surface);
}

.intro-milestone {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--color-text-muted);
  font-weight: 700;
}

.milestone-tag {
  background: var(--brand);
  color: var(--on-brand);
}

.intro-number {
  color: var(--glow-text);
}

.intro-title {
  margin-top: -0.6rem;
  font-size: clamp(1.8rem, 5vw, 2.4rem);
}

.intro-goal {
  display: grid;
  gap: 0.25rem;
  padding: 0.9rem 1rem;
  background: var(--color-surface-2);
  font-size: 1.05rem;
}

.intro-goal .kicker {
  color: var(--crystal-text);
}

.intro-planned {
  padding: 0.6rem 0.9rem;
  border: 1px dashed var(--color-border-strong);
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.intro-phases {
  display: grid;
  gap: 0.5rem;
  padding: 0;
  list-style: none;
}

.intro-phases li {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.intro-phases strong {
  margin-right: 0.35rem;
  color: var(--color-heading);
}

.phase-mark {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.25rem;
  clip-path: var(--shape-hex);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.8rem;
  color: #ffffff;
}

.phase-mark.read {
  background: var(--brand);
}

.phase-mark.learn {
  background: var(--crystal);
}

.phase-mark.apply {
  background: var(--glow);
  color: #06201e;
}

.intro-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
}

.intro-xp {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--crystal-text);
}

.task-enter-active,
.task-leave-active {
  transition:
    opacity 0.2s,
    transform 0.25s var(--ease-out);
}

.task-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.task-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

/* Abschluss */
.summary {
  display: grid;
  justify-items: center;
  gap: 1rem;
  padding: 1.5rem 0;
  text-align: center;
}

.summary h2 {
  font-size: 2rem;
}

.gem {
  display: grid;
  place-items: center;
  width: 7rem;
  height: 6.1rem;
  clip-path: var(--shape-hex);
  background: var(--crystal);
  color: #ffffff;
  font-size: 2.8rem;
  animation: gem-in 0.6s var(--ease-out);
}

.locked-gem {
  background: var(--color-locked-bg);
  color: var(--color-locked-text);
}

@keyframes gem-in {
  0% {
    transform: scale(0.3) rotate(-30deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.08) rotate(4deg);
    opacity: 1;
  }
}

.summary-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

.stat {
  display: grid;
  gap: 0.2rem;
  min-width: 9rem;
  padding: 0.75rem 1.1rem;
  clip-path: var(--shape-card);
  background: var(--color-surface);
}

.stat-xp .stat-label {
  color: var(--crystal-text);
}

.stat-acc .stat-label {
  color: var(--glow-text);
}

.stat-value {
  color: var(--color-heading);
  font-family: var(--font-mono);
  font-size: 1.7rem;
  font-weight: 700;
}

.summary-detail {
  max-width: 28rem;
  color: var(--color-text-muted);
}

.unlock-hint {
  max-width: 28rem;
  padding: 0.6rem 1rem;
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.unlock-hint.unlocked {
  background: var(--glow-soft);
  color: var(--glow-text);
}

.summary-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

@media (max-width: 560px) {
  .stepper li:not(.active) .step-label {
    visibility: hidden;
  }

  .stepper li.active .step-label {
    overflow: visible;
  }
}
</style>
