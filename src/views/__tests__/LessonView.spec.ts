import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import LessonView from '../LessonView.vue'
import type { LessonDetail, LessonSummary } from '@/api'
import { lessonState, resetProgress } from '@/progress'

const lesson: LessonDetail = {
  id: 101,
  milestone: 1,
  milestoneTitle: 'Backend mit Spring Boot',
  milestoneImplemented: true,
  position: 1,
  title: 'So ist unser Projekt aufgebaut',
  goal: 'Du kennst den Aufbau.',
  readings: [
    { title: 'Zwei Programme', text: 'Frontend und Backend.', code: null },
    { title: 'HTTP', text: 'Request und Response.', code: null },
  ],
  tasks: [
    { id: 10101, type: 'MULTIPLE_CHOICE', question: 'Wo läuft das Frontend?', options: ['Im Browser', 'Im Server'], xp: 10 },
    { id: 10102, type: 'INPUT', question: 'Welche Methode liest Daten?', options: [], xp: 15 },
  ],
}

const summaries: LessonSummary[] = [
  { id: 101, milestone: 1, position: 1, title: lesson.title, goal: '', readingCount: 2, taskCount: 2, totalXp: 25 },
  { id: 102, milestone: 1, position: 2, title: 'Java', goal: '', readingCount: 1, taskCount: 1, totalXp: 10 },
]

function json(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response)
}

function stubBackend() {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = String(input)
    if (url.endsWith('/api/lessons/101')) return json(lesson)
    if (url.endsWith('/api/lessons')) return json(summaries)
    if (url.includes('/check')) return json({ correct: true, solution: 'x', explanation: '', xp: 10 })
    return Promise.reject(new Error(`unerwartet: ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  resetProgress()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function clickButton(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text() === text)
  if (!button) throw new Error(`Button "${text}" fehlt: ${wrapper.text()}`)
  await button.trigger('click')
  await flushPromises()
}

function activeStep(wrapper: ReturnType<typeof mount>) {
  return wrapper.get('.stepper li.active').text()
}

describe('LessonView', () => {
  it('runs through Lektion → Lesen → Lernen → Anwenden and unlocks the next lesson', async () => {
    stubBackend()
    const wrapper = mount(LessonView, {
      props: { id: 101 },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    expect(activeStep(wrapper)).toContain('Lektion')
    expect(wrapper.text()).toContain('Du kennst den Aufbau.')

    await clickButton(wrapper, "Los geht's")
    expect(activeStep(wrapper)).toContain('Lesen')
    expect(wrapper.get('.reading-title').text()).toBe('Zwei Programme')

    await clickButton(wrapper, 'Weiter')
    expect(wrapper.get('.reading-title').text()).toBe('HTTP')

    await clickButton(wrapper, 'Zu den Fragen')
    expect(activeStep(wrapper)).toContain('Lernen')

    await wrapper.get('.option').trigger('click')
    await clickButton(wrapper, 'Prüfen')
    await clickButton(wrapper, 'Weiter')
    expect(activeStep(wrapper)).toContain('Anwenden')

    await wrapper.get('input').setValue('GET')
    await clickButton(wrapper, 'Prüfen')
    await clickButton(wrapper, 'Weiter')

    expect(wrapper.text()).toContain('Freigeschaltet: Java')
    expect(lessonState(summaries[1]!, summaries)).toBe('current')
  })
})
