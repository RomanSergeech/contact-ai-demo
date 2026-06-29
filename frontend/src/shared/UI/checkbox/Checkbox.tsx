'use client'

import c from './checkbox.module.scss'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

const Checkbox = ({ checked, onChange, label }: Props) => (
  <label className={c.wrapper}>
    <div className={c.checkbox}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span>
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
          <path d="M5.91869 9.90412L3.17719 7.16262L2 8.33981L5.91869 12.2585L14 4.17719L12.8228 3L5.91869 9.90412Z" fill="currentColor"/>
        </svg>
      </span>
    </div>
    {label && <span className={c.label}>{label}</span>}
  </label>
)

export { Checkbox }
