<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Reading } from '@/api'

const props = defineProps<{
  reading: Reading
  index: number
  total: number
  /** z. B. "1.4 · Klassen & Records" */
  context?: string
}>()

const emit = defineEmits<{
  next: []
  back: []
}>()

interface Inline {
  code: boolean
  text: string
}

type Block = { kind: 'p'; parts: Inline[] } | { kind: 'ul'; items: Inline[][] }

// `Backticks` werden zu Code, ohne v-html und damit ohne XSS-Risiko
function inline(text: string): Inline[] {
  return text
    .split('`')
    .map((part, i) => ({ code: i % 2 === 1, text: part }))
    .filter((part) => part.text !== '')
}

// Leerzeilen trennen Absätze, Zeilen mit "- " werden zu Aufzählungen
function parse(text: string): Block[] {
  const blocks: Block[] = []
  for (const chunk of text.split(/\n\s*\n/)) {
    let paragraph: string[] = []
    let list: Inline[][] = []
    const flushParagraph = () => {
      if (paragraph.length) blocks.push({ kind: 'p', parts: inline(paragraph.join(' ')) })
      paragraph = []
    }
    const flushList = () => {
      if (list.length) blocks.push({ kind: 'ul', items: list })
      list = []
    }
    for (const line of chunk.split('\n').map((l) => l.trim()).filter(Boolean)) {
      if (line.startsWith('- ')) {
        flushParagraph()
        list.push(inline(line.slice(2)))
      } else {
        flushList()
        paragraph.push(line)
      }
    }
    flushParagraph()
    flushList()
  }
  return blocks
}

const blocks = computed(() => parse(props.reading.text))
const nextButton = ref<HTMLButtonElement | null>(null)

onMounted(() => nextButton.value?.focus())
</script>

<template>
  <article class="reading">
    <div class="reading-card">
      <p class="kicker reading-kind">
        <span v-if="context">{{ context }} · </span>Lesen {{ index + 1 }}/{{ total }}
      </p>
      <h2 class="reading-title">{{ reading.title }}</h2>

      <div class="reading-body">
        <template v-for="(block, i) in blocks" :key="i">
          <p v-if="block.kind === 'p'">
            <template v-for="(part, j) in block.parts" :key="j">
              <code v-if="part.code">{{ part.text }}</code>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
          <ul v-else>
            <li v-for="(item, j) in block.items" :key="j">
              <template v-for="(part, k) in item" :key="k">
                <code v-if="part.code">{{ part.text }}</code>
                <template v-else>{{ part.text }}</template>
              </template>
            </li>
          </ul>
        </template>
      </div>

      <pre v-if="reading.code" class="code-block"><code>{{ reading.code }}</code></pre>
    </div>

    <footer class="actions">
      <button v-if="index > 0" type="button" class="btn btn-ghost" @click="emit('back')">Zurück</button>
      <button ref="nextButton" type="button" class="btn next" @click="emit('next')">
        {{ index + 1 < total ? 'Weiter' : 'Zu den Fragen' }}
      </button>
    </footer>
  </article>
</template>

<style scoped>
.reading {
  display: grid;
  gap: 1.25rem;
}

.reading-card {
  display: grid;
  gap: 1rem;
  padding: 1.4rem 1.3rem;
  clip-path: polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%);
  background: var(--color-surface);
}

.reading-kind {
  color: var(--glow-text);
}

.reading-title {
  font-size: clamp(1.5rem, 4vw, 1.85rem);
}

.reading-body {
  display: grid;
  gap: 0.85rem;
  font-size: 1.05rem;
  line-height: 1.65;
}

.reading-body ul {
  display: grid;
  gap: 0.4rem;
  padding-left: 1.25rem;
}

.reading-body li::marker {
  color: var(--crystal);
}

.reading-body code {
  padding: 0.05rem 0.35rem;
  background: var(--crystal-soft);
  color: var(--crystal-text);
  font-size: 0.88em;
}

.code-block {
  margin: 0;
  padding: 1rem 1.1rem;
  border-top: 3px solid var(--crystal);
  background: var(--code-bg);
  color: var(--code-text);
  font-size: 0.86rem;
  line-height: 1.7;
  overflow-x: auto;
}

.actions {
  display: flex;
  gap: 0.75rem;
}

.actions .btn {
  flex: 1;
}

.actions .next {
  flex: 2;
}
</style>
