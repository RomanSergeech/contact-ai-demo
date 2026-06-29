import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExpandableText } from './ExpandableText'

describe('ExpandableText', () => {
  it('рендерит полный текст когда слов меньше порога', () => {
    render(<ExpandableText text="Короткий текст" threshold={10} />)
    expect(screen.getByText('Короткий текст')).toBeInTheDocument()
  })

  it('не показывает кнопку переключения для короткого текста', () => {
    render(<ExpandableText text="Слово один два три" threshold={10} />)
    expect(screen.queryByTitle('Показать полностью')).not.toBeInTheDocument()
  })

  it('обрезает длинный текст и показывает кнопку раскрытия', () => {
    const text = 'а б в г д е ж з и к л м'
    render(<ExpandableText text={text} threshold={10} collapsedWords={5} />)
    expect(screen.queryByText(text)).not.toBeInTheDocument()
    expect(screen.getByTitle('Показать полностью')).toBeInTheDocument()
  })

  it('показывает текст с многоточием при свёрнутом состоянии', () => {
    const text = 'а б в г д е ж з и к л м'
    render(<ExpandableText text={text} threshold={10} collapsedWords={3} />)
    expect(screen.getByText('а б в…')).toBeInTheDocument()
  })

  it('раскрывает полный текст после клика на кнопку', () => {
    const text = 'а б в г д е ж з и к л м'
    render(<ExpandableText text={text} threshold={10} collapsedWords={5} />)
    fireEvent.click(screen.getByTitle('Показать полностью'))
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('сворачивает обратно после повторного клика', () => {
    const text = 'а б в г д е ж з и к л м'
    render(<ExpandableText text={text} threshold={10} collapsedWords={5} />)
    fireEvent.click(screen.getByTitle('Показать полностью'))
    fireEvent.click(screen.getByTitle('Свернуть'))
    expect(screen.queryByText(text)).not.toBeInTheDocument()
  })
})
