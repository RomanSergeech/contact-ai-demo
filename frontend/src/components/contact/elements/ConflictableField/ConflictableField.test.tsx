import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConflictableField } from './ConflictableField'
import type { TLogChange } from '@/shared/types/contact.types'

const makeConflict = (overrides: Partial<TLogChange & { logId: string }> = {}): TLogChange & { logId: string } => ({
  logId:     'log1',
  field:     'full_name',
  old_value: 'Старое имя',
  new_value: 'Новое имя',
  ...overrides,
})

describe('ConflictableField', () => {
  describe('без конфликта', () => {
    it('рендерит label и дочерние элементы', () => {
      render(
        <ConflictableField label="Имя" field="full_name" resolvingKeys={new Set()} onResolveConflict={vi.fn()}>
          <input defaultValue="Значение" />
        </ConflictableField>
      )
      expect(screen.getByText('Имя')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Значение')).toBeInTheDocument()
    })
  })

  describe('с конфликтом', () => {
    it('рендерит ConflictField с обоими значениями', () => {
      render(
        <ConflictableField
          label="Имя"
          field="full_name"
          conflict={makeConflict()}
          resolvingKeys={new Set()}
          onResolveConflict={vi.fn()}
        >
          <input defaultValue="Значение" />
        </ConflictableField>
      )
      expect(screen.getByText('Старое имя')).toBeInTheDocument()
      expect(screen.getByText('Новое имя')).toBeInTheDocument()
    })

    it('не рендерит дочерние элементы при наличии конфликта', () => {
      render(
        <ConflictableField
          label="Имя"
          field="full_name"
          conflict={makeConflict()}
          resolvingKeys={new Set()}
          onResolveConflict={vi.fn()}
        >
          <input defaultValue="Дочерний элемент" />
        </ConflictableField>
      )
      expect(screen.queryByDisplayValue('Дочерний элемент')).not.toBeInTheDocument()
    })

    it('передаёт logId и field в onResolveConflict при разрешении', () => {
      const onResolveConflict = vi.fn()
      const { container } = render(
        <ConflictableField
          label="Телефон"
          field="phone"
          conflict={makeConflict({ logId: 'log42', field: 'phone' })}
          resolvingKeys={new Set()}
          onResolveConflict={onResolveConflict}
        >
          <input />
        </ConflictableField>
      )
      fireEvent.click(container.querySelector('[class*="row_old"]')!)
      expect(onResolveConflict).toHaveBeenCalledWith('log42', 'phone', 'old')
    })

    it('блокирует кнопку объединения когда поле в resolvingKeys', () => {
      render(
        <ConflictableField
          label="Имя"
          field="full_name"
          conflict={makeConflict({ logId: 'log1' })}
          resolvingKeys={new Set(['log1_full_name'])}
          onResolveConflict={vi.fn()}
        >
          <input />
        </ConflictableField>
      )
      expect(screen.getByTitle('Объединить')).toBeDisabled()
    })

    it('применяет formatValue к значениям конфликта', () => {
      const formatValue = (v: string | null) => v ? `[${v}]` : ''
      render(
        <ConflictableField
          label="Дата"
          field="birth_date"
          conflict={makeConflict({ old_value: '2024-01-15', new_value: '2024-06-20' })}
          resolvingKeys={new Set()}
          onResolveConflict={vi.fn()}
          formatValue={formatValue}
        >
          <input />
        </ConflictableField>
      )
      expect(screen.getByText('[2024-01-15]')).toBeInTheDocument()
      expect(screen.getByText('[2024-06-20]')).toBeInTheDocument()
    })
  })
})
