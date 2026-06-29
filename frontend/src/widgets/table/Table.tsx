import { cn, getPaginationPages } from '@/shared/utils'

import type { ReactElement, ReactNode } from 'react'

import c from './table.module.scss'


interface TTitlesElemsBase {
  value: string
  key?: string
  sort?: boolean
}

interface TTitlesElemsWithSort extends TTitlesElemsBase {
  value: string
  key: string
  sort: boolean
}
interface TTitlesElemsWithoutSort extends TTitlesElemsBase {
  value: string
  key?: never
  sort?: never
}

interface TTitlesBase {
  titles: (TTitlesElemsWithSort | TTitlesElemsWithoutSort)[]
  sort?: { column: string; order: string }
  queryBySort?: (column: string, sortOrder: string) => void
}
interface TTitlesWithSort extends TTitlesBase {
  sort: { column: string; order: string }
  queryBySort: (column: string, sortOrder: string) => void
}
interface TTitlesWithoutSort extends TTitlesBase {
  sort?: never
  queryBySort?: never
}

export type TTitles = TTitlesWithSort | TTitlesWithoutSort

interface TableProps {
  titles: TTitles
  columns: (cn: { text: string | undefined }) => ReactNode
  total?: (cn: { total: string | undefined }) => ReactNode
  emptyData: boolean
  loading: boolean
  emptyTotal?: boolean
  pagination?: {
    page: number
    pages: number
    choosePage: (num: number) => void
  }
  loadingText?: string
  emptyDataText?: string
  tableClassName?: string
}

type TTable = (data: TableProps) => ReactElement

const Table: TTable = ({ titles, columns, total, emptyData, loading, emptyTotal, pagination, loadingText, emptyDataText, tableClassName }) => {

  if (loading) {
    return (
      <div className={cn(c.table, tableClassName)}>
        <ul className={c.empty_data}>
          {loadingText || 'Загрузка...'}
        </ul>
      </div>
    )
  }

  if (emptyData || emptyTotal) {
    return (
      <div className={cn(c.table, tableClassName)}>
        <ul className={c.empty_data}>
          {emptyDataText || 'Нет данных'}
        </ul>
      </div>
    )
  }

  return (
    <div className={cn(c.table, tableClassName)}>

      <ul>
        {titles.titles.map((title, i) => {
          if (titles.sort && title.sort && title.key) {
            return (
              <li key={i} className={c.title}>
                <p>{title.value}</p>
                <button onClick={() => titles.queryBySort?.(title.key!, titles.sort!.order)}>
                  <svg className={titles.sort.column === title.key ? c[titles.sort.order] : ''} width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M5.33341 10.6666H2.66675L6.66675 14.6666V12.6666V10.6666V1.33331H5.33341V10.6666Z" fill="#FFFFFF" />
                    <path d="M9.33325 3.33331V5.33331V14.6666H10.6666V5.33331H13.3333L9.33325 1.33331V3.33331Z" fill="#FFFFFF" />
                  </svg>
                </button>
              </li>
            )
          }
          return (
            <li key={i} className={c.title}>
              <p>{title.value}</p>
            </li>
          )
        })}
      </ul>

      {columns({ text: c.text })}

      {total?.({ total: c.total })}

      {pagination && pagination.pages > 1 && (
        <div className={c.pagination}>
          <div
            className={cn(c.arrow, c.left)}
            onClick={() => pagination.choosePage(pagination.page - 1 || 1)}
          />
          {getPaginationPages(pagination.page, pagination.pages).map((item, i) =>
            item === 'ellipsis'
              ? <div key={`ellipsis-${i}`} className={c.number}>...</div>
              : (
                <div
                  key={item}
                  className={c.number}
                  data-active={pagination.page === item}
                  onClick={() => pagination.choosePage(item)}
                >
                  {item}
                </div>
              )
          )}
          <div
            className={cn(c.arrow, c.right)}
            onClick={() => pagination.choosePage(pagination.page + 1 > pagination.pages ? pagination.pages : pagination.page + 1)}
          />
        </div>
      )}

    </div>
  )
}

export { Table }
