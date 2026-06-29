import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Table, type TTitles } from './Table'
import type { ReactNode } from 'react'

const columns = (): ReactNode => <div data-testid="columns" />

const baseProps = {
  titles: { titles: [{ value: 'Имя' }, { value: 'Дата' }] } as TTitles,
  columns,
  emptyData: false,
  loading:   false,
}

describe('Table', () => {
  describe('loading state', () => {
    it('shows default loading text', () => {
      render(<Table {...baseProps} loading />)
      expect(screen.getByText('Загрузка...')).toBeInTheDocument()
    })

    it('shows custom loading text', () => {
      render(<Table {...baseProps} loading loadingText="Подождите..." />)
      expect(screen.getByText('Подождите...')).toBeInTheDocument()
    })

    it('does not render columns when loading', () => {
      render(<Table {...baseProps} loading />)
      expect(screen.queryByTestId('columns')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows default empty text when emptyData is true', () => {
      render(<Table {...baseProps} emptyData />)
      expect(screen.getByText('Нет данных')).toBeInTheDocument()
    })

    it('shows custom empty data text', () => {
      render(<Table {...baseProps} emptyData emptyDataText="Нет записей" />)
      expect(screen.getByText('Нет записей')).toBeInTheDocument()
    })

    it('shows empty state when emptyTotal is true', () => {
      render(<Table {...baseProps} emptyTotal />)
      expect(screen.getByText('Нет данных')).toBeInTheDocument()
    })

    it('does not render columns when empty', () => {
      render(<Table {...baseProps} emptyData />)
      expect(screen.queryByTestId('columns')).not.toBeInTheDocument()
    })
  })

  describe('normal render', () => {
    it('renders all column title labels', () => {
      render(<Table {...baseProps} />)
      expect(screen.getByText('Имя')).toBeInTheDocument()
      expect(screen.getByText('Дата')).toBeInTheDocument()
    })

    it('renders the columns slot', () => {
      render(<Table {...baseProps} />)
      expect(screen.getByTestId('columns')).toBeInTheDocument()
    })

    it('renders the total slot when provided', () => {
      render(<Table {...baseProps} total={() => <div data-testid="total" />} />)
      expect(screen.getByTestId('total')).toBeInTheDocument()
    })

    it('does not render total slot when not provided', () => {
      render(<Table {...baseProps} />)
      expect(screen.queryByTestId('total')).not.toBeInTheDocument()
    })
  })

  describe('sort', () => {
    const queryBySort = vi.fn()
    const sortTitles: TTitles = {
      titles:      [{ value: 'Имя', key: 'name', sort: true }, { value: 'Дата' }],
      sort:        { column: 'name', order: 'asc' },
      queryBySort,
    }

    beforeEach(() => queryBySort.mockClear())

    it('renders a sort button for sortable columns', () => {
      render(<Table {...baseProps} titles={sortTitles} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('does not render sort buttons when no column has sort flag', () => {
      render(<Table {...baseProps} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('calls queryBySort with column key and current order on click', () => {
      render(<Table {...baseProps} titles={sortTitles} />)
      fireEvent.click(screen.getByRole('button'))
      expect(queryBySort).toHaveBeenCalledWith('name', 'asc')
    })
  })

  describe('pagination', () => {
    const choosePage = vi.fn()
    beforeEach(() => choosePage.mockClear())

    it('does not render pagination when pages === 1', () => {
      const { container } = render(
        <Table {...baseProps} pagination={{ page: 1, pages: 1, choosePage }} />
      )
      expect(container.querySelector('.pagination')).not.toBeInTheDocument()
    })

    it('renders page numbers when pages > 1', () => {
      render(<Table {...baseProps} pagination={{ page: 1, pages: 3, choosePage }} />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('clicking a page number calls choosePage with that number', () => {
      render(<Table {...baseProps} pagination={{ page: 1, pages: 3, choosePage }} />)
      fireEvent.click(screen.getByText('2'))
      expect(choosePage).toHaveBeenCalledWith(2)
    })

    it('active page has data-active attribute', () => {
      render(<Table {...baseProps} pagination={{ page: 2, pages: 3, choosePage }} />)
      expect(screen.getByText('2')).toHaveAttribute('data-active')
    })

    it('inactive pages do not have data-active', () => {
      render(<Table {...baseProps} pagination={{ page: 2, pages: 3, choosePage }} />)
      expect(screen.getByText('1')).toHaveAttribute('data-active', 'false')
      expect(screen.getByText('3')).toHaveAttribute('data-active', 'false')
    })

    it('left arrow calls choosePage(page - 1)', () => {
      render(<Table {...baseProps} pagination={{ page: 3, pages: 5, choosePage }} />)
      // Pagination container: [left-arrow, ...pages, right-arrow]
      const leftArrow = screen.getByText('1').parentElement!.firstElementChild!
      fireEvent.click(leftArrow)
      expect(choosePage).toHaveBeenCalledWith(2)
    })

    it('left arrow clamps to page 1 when already on first page', () => {
      render(<Table {...baseProps} pagination={{ page: 1, pages: 3, choosePage }} />)
      const leftArrow = screen.getByText('1').parentElement!.firstElementChild!
      fireEvent.click(leftArrow)
      expect(choosePage).toHaveBeenCalledWith(1)
    })

    it('right arrow calls choosePage(page + 1)', () => {
      render(<Table {...baseProps} pagination={{ page: 2, pages: 5, choosePage }} />)
      const rightArrow = screen.getByText('1').parentElement!.lastElementChild!
      fireEvent.click(rightArrow)
      expect(choosePage).toHaveBeenCalledWith(3)
    })

    it('right arrow clamps to last page when already on last page', () => {
      render(<Table {...baseProps} pagination={{ page: 5, pages: 5, choosePage }} />)
      const rightArrow = screen.getByText('1').parentElement!.lastElementChild!
      fireEvent.click(rightArrow)
      expect(choosePage).toHaveBeenCalledWith(5)
    })

    it('renders ellipsis for skipped pages when total > 5', () => {
      render(<Table {...baseProps} pagination={{ page: 5, pages: 10, choosePage }} />)
      expect(screen.getAllByText('...')).toHaveLength(2)
    })
  })
})
