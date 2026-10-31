import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReadingCard from '../ReadingCard.vue'

const reading = {
  title: 'Variablen',
  text: 'Mit `let` legst du eine Variable an.\n\n- `const`: fest\n- `let`: änderbar',
  code: 'let punkte = 0',
}

describe('ReadingCard', () => {
  it('renders paragraphs, lists, inline code and the code block', () => {
    const wrapper = mount(ReadingCard, { props: { reading, index: 0, total: 2 } })

    expect(wrapper.get('.reading-title').text()).toBe('Variablen')
    expect(wrapper.get('.reading-body p').text()).toBe('Mit let legst du eine Variable an.')
    expect(wrapper.findAll('.reading-body li')).toHaveLength(2)
    expect(wrapper.findAll('.reading-body code').map((c) => c.text())).toEqual(['let', 'const', 'let'])
    expect(wrapper.get('.code-block').text()).toBe('let punkte = 0')
  })

  it('never renders text as HTML', () => {
    const wrapper = mount(ReadingCard, {
      props: { reading: { title: 'x', text: '<img src=x onerror=alert(1)>', code: null }, index: 0, total: 1 },
    })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img')
  })

  it('emits next and back', async () => {
    const wrapper = mount(ReadingCard, { props: { reading, index: 1, total: 2 } })
    const [back, next] = wrapper.findAll('.btn')

    expect(next!.text()).toBe('Zu den Fragen')
    await back!.trigger('click')
    await next!.trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('hides the back button on the first page', () => {
    const wrapper = mount(ReadingCard, { props: { reading, index: 0, total: 2 } })
    expect(wrapper.findAll('.btn').map((b) => b.text())).toEqual(['Weiter'])
  })
})
