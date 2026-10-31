import { afterEach, describe, it, expect } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import TaskCard from '../TaskCard.vue'
import type { Task } from '@/api'

const mcTask: Task = {
  id: 101,
  type: 'MULTIPLE_CHOICE',
  question: 'Welcher Datentyp speichert ganze Zahlen?',
  options: ['int', 'String', 'boolean'],
  xp: 10,
}

const inputTask: Task = {
  id: 104,
  type: 'INPUT',
  question: 'Deklariere alter',
  options: [],
  xp: 15,
}

function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

// TaskCard hängt einen keydown-Listener an window, der beim Unmount wieder weg muss
enableAutoUnmount(afterEach)

describe('TaskCard', () => {
  it('renders all options of a multiple choice task', () => {
    const wrapper = mount(TaskCard, { props: { task: mcTask, result: null } })
    expect(wrapper.text()).toContain(mcTask.question)
    expect(wrapper.findAll('.option')).toHaveLength(3)
  })

  it('shows code lines of the question as a code block', () => {
    const task = { ...inputTask, question: 'Was wird ausgegeben?\nint x = 7;' }
    const wrapper = mount(TaskCard, { props: { task, result: null } })
    expect(wrapper.get('.question').text()).toBe('Was wird ausgegeben?')
    expect(wrapper.get('.code-block').text()).toBe('int x = 7;')
  })

  it('emits the selected option on submit', async () => {
    const wrapper = mount(TaskCard, { props: { task: mcTask, result: null } })
    const checkButton = wrapper.get('.actions .btn')
    expect(checkButton.attributes('disabled')).toBeDefined()

    await wrapper.findAll('.option')[0]!.trigger('click')
    await checkButton.trigger('click')

    expect(wrapper.emitted('submit')).toEqual([['int']])
  })

  it('selects options with number keys and submits with enter', async () => {
    const wrapper = mount(TaskCard, { props: { task: mcTask, result: null } })

    pressKey('2')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.option.selected .option-text').text()).toBe('String')

    pressKey('Enter')
    expect(wrapper.emitted('submit')).toEqual([['String']])
  })

  it('emits typed input on enter', async () => {
    const wrapper = mount(TaskCard, { props: { task: inputTask, result: null } })
    const input = wrapper.get('input')
    await input.setValue('  int alter = 20;  ')
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('submit')).toEqual([['int alter = 20;']])
  })

  it('shows the solution after a wrong answer and continues on click', async () => {
    const wrapper = mount(TaskCard, {
      props: {
        task: mcTask,
        result: { correct: false, solution: 'int', explanation: 'int speichert ganze Zahlen.', xp: 0 },
      },
    })
    expect(wrapper.text()).toContain('Leider falsch')
    expect(wrapper.text()).toContain('Lösung: int')
    expect(wrapper.find('.option.correct .option-text').text()).toBe('int')

    await wrapper.get('.feedback .btn').trigger('click')
    expect(wrapper.emitted('next')).toHaveLength(1)
  })
})
