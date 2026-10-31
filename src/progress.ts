import { computed, reactive, watch } from 'vue'

/**
 * Lernfortschritt pro Lektion. Liegt vorerst im localStorage des Browsers,
 * bis Login und Datenbank angebunden sind.
 */
export interface LessonResult {
  xp: number
  accuracy: number
}

export type LessonState = 'completed' | 'current' | 'locked'

interface PathLesson {
  id: number
  milestone: number
  position: number
}

/** Ab so viel Prozent richtiger Antworten gilt eine Lektion als bestanden. */
export const PASS_ACCURACY = 50

const STORAGE_KEY = 'project-reksai-progress'

function load(): Record<number, LessonResult> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

const completed = reactive<Record<number, LessonResult>>(load())

watch(completed, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Privater Modus o. Ä.: Fortschritt gilt dann nur für diese Sitzung
  }
})

export const totalXp = computed(() =>
  Object.values(completed).reduce((sum, result) => sum + result.xp, 0),
)

/** Ein Level pro 100 XP, wie es Lektion 5.7 für das Backend beschreibt. */
export const XP_PER_LEVEL = 100
export const level = computed(() => Math.floor(totalXp.value / XP_PER_LEVEL) + 1)
export const levelProgress = computed(() => (totalXp.value % XP_PER_LEVEL) / XP_PER_LEVEL)

export function resultFor(lessonId: number): LessonResult | undefined {
  return completed[lessonId]
}

/** Speichert das beste Ergebnis. Gibt zurück, ob die Lektion bestanden ist. */
export function recordResult(lessonId: number, xp: number, accuracy: number): boolean {
  if (accuracy < PASS_ACCURACY) {
    return false
  }
  const previous = completed[lessonId]
  completed[lessonId] = {
    xp: Math.max(previous?.xp ?? 0, xp),
    accuracy: Math.max(previous?.accuracy ?? 0, accuracy),
  }
  return true
}

export function resetProgress() {
  for (const id of Object.keys(completed)) {
    delete completed[Number(id)]
  }
}

// Der Lernpfad ist eine Linie: Meilenstein für Meilenstein, Lektion für Lektion
function learningPath<T extends PathLesson>(lessons: T[]): T[] {
  return [...lessons].sort((a, b) => a.milestone - b.milestone || a.position - b.position)
}

export function previousLesson<T extends PathLesson>(lesson: PathLesson, lessons: T[]): T | undefined {
  const path = learningPath(lessons)
  return path[path.findIndex((other) => other.id === lesson.id) - 1]
}

export function nextLesson<T extends PathLesson>(lesson: PathLesson, lessons: T[]): T | undefined {
  const path = learningPath(lessons)
  const index = path.findIndex((other) => other.id === lesson.id)
  return index === -1 ? undefined : path[index + 1]
}

/** Eine Lektion ist offen, wenn sie die allererste ist oder die vorige bestanden wurde. */
export function lessonState(lesson: PathLesson, lessons: PathLesson[]): LessonState {
  if (completed[lesson.id]) {
    return 'completed'
  }
  const previous = previousLesson(lesson, lessons)
  return !previous || completed[previous.id] ? 'current' : 'locked'
}
