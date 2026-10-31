import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import HomeView from '../HomeView.vue'
import type { LessonSummary, Milestone } from '@/api'
import { recordResult, resetProgress } from '@/progress'

function summary(id: number, milestone: number, position: number, title: string): LessonSummary {
  return { id, milestone, position, title, goal: '', readingCount: 2, taskCount: 3, totalXp: 40 }
}

const milestones: Milestone[] = [
  {
    number: 1,
    title: 'Backend mit Spring Boot',
    goal: '',
    implemented: true,
    lessons: [summary(102, 1, 2, 'Java'), summary(101, 1, 1, 'Aufbau')],
  },
  {
    number: 2,
    title: 'Frontend mit Vue',
    goal: '',
    implemented: false,
    lessons: [summary(201, 2, 1, 'HTML')],
  },
]

function stubBackend() {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve(milestones) } as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function mountView() {
  const wrapper = mount(HomeView, { global: { stubs: { RouterLink: RouterLinkStub } } })
  await flushPromises()
  return wrapper
}

function rowStates(wrapper: Awaited<ReturnType<typeof mountView>>) {
  return wrapper.findAll('.node-row').map((row) => ({
    title: row.get('.node-label strong').text(),
    state: ['completed', 'current', 'locked'].find((s) => row.classes(s)),
  }))
}

beforeEach(() => {
  resetProgress()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HomeView', () => {
  it('shows the milestones as one learning path', async () => {
    const fetchMock = stubBackend()
    const wrapper = await mountView()

    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/api\/milestones$/), undefined)
    expect(wrapper.findAll('.milestone-title').map((h) => h.text())).toEqual([
      'Backend mit Spring Boot',
      'Frontend mit Vue',
    ])
    expect(rowStates(wrapper)).toEqual([
      { title: 'Aufbau', state: 'current' },
      { title: 'Java', state: 'locked' },
      { title: 'HTML', state: 'locked' },
    ])
  })

  it('marks milestones that are still planned in the project', async () => {
    stubBackend()
    const wrapper = await mountView()

    const kickers = wrapper.findAll('.milestone-kicker').map((k) => k.text())
    expect(kickers).toEqual(['Meilenstein 1', 'Meilenstein 2 Geplant'])
    expect(wrapper.find('.coming-soon').exists()).toBe(true)
  })

  it('links only to unlocked lessons', async () => {
    stubBackend()
    const wrapper = await mountView()

    const targets = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))
    expect(targets).toEqual([{ name: 'lesson', params: { id: 101 } }])
  })

  it('opens the next milestone once the previous one is done', async () => {
    recordResult(101, 40, 100)
    recordResult(102, 40, 100)
    stubBackend()
    const wrapper = await mountView()

    expect(rowStates(wrapper)[2]).toEqual({ title: 'HTML', state: 'current' })
    expect(wrapper.findAll('.milestone')[1]!.classes()).not.toContain('locked')
    expect(wrapper.text()).toContain('2/2')
  })

  it('shows an error when the backend is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')))

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Läuft das Backend?')
  })
})
