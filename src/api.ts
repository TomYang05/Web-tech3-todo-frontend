export type TaskType = 'MULTIPLE_CHOICE' | 'INPUT'

export interface LessonSummary {
  id: number
  milestone: number
  position: number
  title: string
  goal: string
  readingCount: number
  taskCount: number
  totalXp: number
}

export interface Milestone {
  number: number
  title: string
  goal: string
  /** false: Lektionen gibt es schon, im Projekt-Code ist der Meilenstein noch geplant */
  implemented: boolean
  lessons: LessonSummary[]
}

export interface Reading {
  title: string
  text: string
  code: string | null
}

export interface Task {
  id: number
  type: TaskType
  question: string
  options: string[]
  xp: number
}

export interface LessonDetail {
  id: number
  milestone: number
  milestoneTitle: string
  milestoneImplemented: boolean
  position: number
  title: string
  goal: string
  readings: Reading[]
  tasks: Task[]
}

export interface CheckResult {
  correct: boolean
  solution: string
  explanation: string
  xp: number
}

const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL ?? 'http://localhost:8080'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init)
  if (!response.ok) {
    throw new Error(`Backend antwortet mit ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function fetchMilestones(): Promise<Milestone[]> {
  return request('/api/milestones')
}

export function fetchLessons(): Promise<LessonSummary[]> {
  return request('/api/lessons')
}

export function fetchLesson(id: number): Promise<LessonDetail> {
  return request(`/api/lessons/${id}`)
}

export function checkAnswer(taskId: number, answer: string): Promise<CheckResult> {
  return request(`/api/tasks/${taskId}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  })
}
