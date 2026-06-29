import type { ReactNode } from 'react'
import { ConflictField } from '@/shared/UI'
import type { TLogChange } from '@/shared/types/contact.types'

interface Props {
  label: string
  field: string
  conflict?: (TLogChange & { logId: string }) | undefined
  resolvingKeys: Set<string>
  onResolveConflict: (logId: string, field: string, choice: 'old' | 'new' | 'merge') => void
  multiline?: boolean
  mergeable?: boolean
  formatValue?: (value: string | null) => string
  children: ReactNode
}

const ConflictableField = ({
  label,
  field,
  conflict,
  resolvingKeys,
  onResolveConflict,
  multiline,
  mergeable = true,
  formatValue,
  children,
}: Props) => {

  if (conflict) {
    const format = formatValue ?? (value => value ?? '')

    return (
      <ConflictField
        label={label}
        multiline={multiline}
        mergeable={mergeable}
        oldValue={format(conflict.old_value)}
        newValue={format(conflict.new_value)}
        loading={resolvingKeys.has(`${conflict.logId}_${field}`)}
        onResolve={choice => onResolveConflict(conflict.logId, field, choice)}
      />
    )
  }

  return (
    <>
      <label>{label}</label>
      {children}
    </>
  )
}

export { ConflictableField }
