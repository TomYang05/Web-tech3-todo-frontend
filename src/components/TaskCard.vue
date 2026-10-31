<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { CheckResult, Task } from '@/api'

const props = defineProps<{
  task: Task
  result: CheckResult | null
  busy?: boolean
}>()

const emit = defineEmits<{
  submit: [answer: string]
  next: []
}>()

const selected = ref<string | null>(null)
const typed = ref('')

// Erste Zeile ist die Frage, weitere Zeilen sind Code, der als Block angezeigt wird
const prompt = computed(() => {
  const [text = '', ...code] = props.task.question.split('\n')
  return { text, code: code.join('\n') }
})

const answer = computed(() =>
  props.task.type === 'MULTIPLE_CHOICE' ? (selected.value ?? '') : typed.value.trim(),
)
const answered = computed(() => props.result !== null)

function submit() {
  if (answer.value && !answered.value && !props.busy) {
    emit('submit', answer.value)
  }
}

function confirm() {
  if (answered.value) {
    emit('next')
  } else {
    submit()
  }
}

function optionClass(option: string) {
  if (!props.result) {
    return { selected: option === selected.value }
  }
  return {
    correct: option === props.result.solution,
    wrong: option === selected.value && !props.result.correct,
  }
}

// Tastatur: 1–4 wählt eine Option, Enter prüft bzw. geht weiter
function onKeydown(event: KeyboardEvent) {
  // Eingabefeld und Buttons behandeln Enter selbst
  const target = event.target
  if (target instanceof Element && target.closest('input, button, a')) return

  if (event.key === 'Enter') {
    confirm()
    return
  }
  const index = Number(event.key) - 1
  const option = props.task.options[index]
  if (props.task.type === 'MULTIPLE_CHOICE' && !answered.value && option !== undefined) {
    selected.value = option
  }
}

const inputEl = ref<HTMLInputElement | null>(null)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  inputEl.value?.focus()
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <article class="task">
    <p class="kicker task-kind" :class="task.type === 'MULTIPLE_CHOICE' ? 'mc' : 'input'">
      {{ task.type === 'MULTIPLE_CHOICE' ? 'Wähle die richtige Antwort' : 'Schreib die Antwort' }}
      <span class="task-xp"><span class="xp-gem" aria-hidden="true"></span>+{{ task.xp }} XP</span>
    </p>
    <h2 class="question">{{ prompt.text }}</h2>
    <pre v-if="prompt.code" class="code-block"><code>{{ prompt.code }}</code></pre>

    <div v-if="task.type === 'MULTIPLE_CHOICE'" class="options">
      <button
        v-for="(option, i) in task.options"
        :key="option"
        type="button"
        class="option"
        :class="optionClass(option)"
        :disabled="answered"
        @click="selected = option"
      >
        <kbd class="option-key">{{ i + 1 }}</kbd>
        <span class="option-text">{{ option }}</span>
      </button>
    </div>

    <label
      v-else
      class="editor"
      :class="{ correct: result?.correct, wrong: result && !result.correct }"
    >
      <span class="editor-prompt" aria-hidden="true">&gt;</span>
      <input
        ref="inputEl"
        v-model="typed"
        class="answer-input"
        :disabled="answered"
        placeholder="Deine Antwort"
        aria-label="Deine Antwort"
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        @keydown.enter="confirm"
      />
    </label>

    <Transition name="slide">
      <footer v-if="result" class="feedback" :class="result.correct ? 'ok' : 'fail'">
        <span class="feedback-icon" aria-hidden="true">{{ result.correct ? '✓' : '✕' }}</span>
        <div class="feedback-text" role="status">
          <strong>{{ result.correct ? `Richtig! +${result.xp} XP` : 'Leider falsch' }}</strong>
          <p v-if="!result.correct">
            Lösung: <code>{{ result.solution }}</code>
          </p>
          <p>{{ result.explanation }}</p>
        </div>
        <button
          type="button"
          class="btn"
          :class="result.correct ? 'btn-success' : 'btn-danger'"
          @click="emit('next')"
        >
          Weiter
        </button>
      </footer>
    </Transition>

    <div v-if="!result" class="actions">
      <span class="hint">
        <kbd>Enter</kbd> {{ task.type === 'MULTIPLE_CHOICE' ? '· Optionen mit 1–4' : 'zum Prüfen' }}
      </span>
      <button type="button" class="btn" :disabled="!answer || busy" @click="submit">
        Prüfen
      </button>
    </div>
  </article>
</template>

<style scoped>
.task {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.task-kind {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--crystal-text);
}

.task-kind.input {
  color: var(--glow-text);
}

.task-xp {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
  color: var(--color-heading);
  letter-spacing: 0.05em;
}

.xp-gem {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--crystal);
  transform: rotate(45deg);
}

.question {
  font-size: clamp(1.35rem, 3.5vw, 1.65rem);
}

.code-block {
  margin: 0;
  padding: 1rem 1.1rem;
  border-top: 3px solid var(--crystal);
  background: var(--code-bg);
  color: var(--code-text);
  font-size: 0.88rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.options {
  display: grid;
  gap: 0.6rem;
}

/* Antworten als Kristall-Leisten mit abgeschnittener Ecke */
.option {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.6rem 1rem 0.6rem 0.6rem;
  border: none;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
  background: var(--color-surface);
  box-shadow: inset 0 0 0 1px var(--color-border);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s,
    box-shadow 0.15s;
}

.option:hover:not(:disabled) {
  background: var(--color-surface-2);
}

.option:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 3px var(--glow);
}

.option-key {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 1.85rem;
  clip-path: var(--shape-hex);
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  font-size: 0.8rem;
  font-weight: 700;
}

.option.selected {
  background: var(--glow-soft);
  box-shadow: inset 0 0 0 2px var(--glow);
}

.option.selected .option-key {
  background: var(--glow);
  color: #06201e;
}

.option.correct {
  background: var(--color-success-bg);
  box-shadow: inset 0 0 0 2px var(--color-success);
  color: var(--color-success-text);
}

.option.correct .option-key {
  background: var(--color-success);
  color: #06201e;
}

.option.wrong {
  background: var(--color-error-bg);
  box-shadow: inset 0 0 0 2px var(--color-error);
  color: var(--color-error-text);
  animation: shake 0.35s;
}

.option.wrong .option-key {
  background: var(--color-error);
  color: #ffffff;
}

.option:disabled {
  cursor: default;
}

.editor {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 1rem;
  border-left: 3px solid var(--crystal);
  background: var(--code-bg);
  transition: border-color 0.15s;
}

.editor:focus-within {
  border-left-color: var(--glow);
}

.editor.correct {
  border-left-color: var(--color-success);
}

.editor.wrong {
  border-left-color: var(--color-error);
  animation: shake 0.35s;
}

.editor-prompt {
  color: var(--glow);
  font-family: var(--font-mono);
  font-weight: 700;
}

.answer-input {
  flex: 1;
  min-width: 0;
  padding: 0.85rem 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--code-text);
  font-family: var(--font-mono);
  caret-color: var(--glow);
}

.answer-input::placeholder {
  color: rgb(230 232 255 / 45%);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
}

.hint {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.hint kbd {
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--color-border-strong);
  font-size: 0.75rem;
}

.feedback {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-top: 0.25rem;
  padding: 1.1rem 1.2rem;
  clip-path: var(--shape-card);
}

.feedback.ok {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.feedback.fail {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.feedback-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 2.8rem;
  height: 2.45rem;
  clip-path: var(--shape-hex);
  background: var(--color-success);
  color: #06201e;
  font-weight: 800;
  font-size: 1.15rem;
}

.fail .feedback-icon {
  background: var(--color-error);
  color: #ffffff;
}

.feedback-text {
  flex: 1 1 14rem;
  display: grid;
  gap: 0.2rem;
}

.feedback-text strong {
  font-size: 1.15rem;
}

.feedback-text code {
  font-weight: 700;
}

.slide-enter-active {
  transition:
    opacity 0.2s,
    transform 0.3s var(--ease-out);
}

.slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

@keyframes shake {
  25% {
    transform: translateX(-5px);
  }
  50% {
    transform: translateX(5px);
  }
  75% {
    transform: translateX(-3px);
  }
}

@media (max-width: 560px) {
  .hint {
    display: none;
  }

  .actions .btn,
  .feedback .btn {
    flex: 1 1 100%;
  }
}
</style>
