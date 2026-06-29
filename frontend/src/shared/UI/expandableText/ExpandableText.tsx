'use client'

import { useState } from 'react'

import c from './expandableText.module.scss'

interface Props {
  text: string
  threshold?: number
  collapsedWords?: number
  className?: string
}

const ExpandableText = ({ text, threshold = 10, collapsedWords = 5, className }: Props) => {

  const [expanded, setExpanded] = useState(false)

  const words = text.split(/\s+/)
  const isLong = words.length > threshold

  const displayText = expanded || !isLong ? text : words.slice(0, collapsedWords).join(' ') + '…'

  return (
    <span className={`${c.wrapper} ${className ?? ''}`}>
      <span
        className={c.text}
        data-expanded={expanded}
      >
        {displayText}
      </span>

      {isLong &&
        <button
          type="button"
          className={c.toggle}
          data-expanded={expanded}
          title={expanded ? 'Свернуть' : 'Показать полностью'}
          onClick={() => setExpanded(prev => !prev)}
        >
          <span className={c.icon}>+</span>
        </button>
      }
    </span>
  )
}

export { ExpandableText }
