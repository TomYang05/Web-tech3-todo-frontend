import { beforeEach, describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import {
  lessonState,
  nextLesson,
  recordResult,
  resetProgress,
  resultFor,
  totalXp,
} from '@/progress'

// Absichtlich unsortiert: Die Reihenfolge ergibt sich aus Meilenstein und Position
const m1l2 = { id: 102, milestone: 1, position: 2 }
const m1l1 = { id: 101, milestone: 1, position: 1 }
const m2l1 = { id: 201, milestone: 2, position: 1 }
const m2l2 = { id: 202, milestone: 2, position: 2 }
const lessons = [m2l1, m1l2, m2l2, m1l1]

beforeEach(() => {
  resetProgress()
})

describe('progress', () => {
  it('opens only the very first lesson at the start', () => {
    expect(lessonState(m1l1, lessons)).toBe('current')
    expect(lessonState(m1l2, lessons)).toBe('locked')
    expect(lessonState(m2l1, lessons)).toBe('locked')
  })

  it('unlocks the next lesson after passing', () => {
    expect(recordResult(101, 45, 75)).toBe(true)

    expect(lessonState(m1l1, lessons)).toBe('completed')
    expect(lessonState(m1l2, lessons)).toBe('current')
    expect(lessonState(m2l1, lessons)).toBe('locked')
  })

  it('unlocks the next milestone after its last lesson', () => {
    recordResult(101, 45, 100)
    recordResult(102, 50, 100)

    expect(lessonState(m2l1, lessons)).toBe('current')
    expect(lessonState(m2l2, lessons)).toBe('locked')
  })

  it('keeps the next lesson locked below the pass mark', () => {
    expect(recordResult(101, 10, 25)).toBe(false)
    expect(lessonState(m1l2, lessons)).toBe('locked')
  })

  it('keeps the best result and sums xp', () => {
    recordResult(101, 45, 100)
    recordResult(101, 20, 50)
    recordResult(102, 30, 100)

    expect(resultFor(101)).toEqual({ xp: 45, accuracy: 100 })
    expect(totalXp.value).toBe(75)
  })

  it('persists progress in localStorage', async () => {
    recordResult(101, 45, 100)
    await nextTick()
    expect(JSON.parse(localStorage.getItem('project-reksai-progress')!)).toEqual({
      101: { xp: 45, accuracy: 100 },
    })
  })

  it('finds the next lesson across milestones', () => {
    expect(nextLesson(m1l1, lessons)?.id).toBe(102)
    expect(nextLesson(m1l2, lessons)?.id).toBe(201)
    expect(nextLesson(m2l2, lessons)).toBeUndefined()
  })
})
