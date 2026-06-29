'use client'

import { useState } from 'react'
import { useUserStore } from '@/shared/store'
import { Button, Textarea } from '@/shared/UI'

import c from './AiPromptSection.module.scss'


const AiPromptSection = () => {
  const { ai_system_prompt, saveAiPrompt } = useUserStore()

  const [prompt, setPrompt] = useState(ai_system_prompt ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAiPrompt(prompt)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={c.section}>
      <p className={c.section_title}>Умная настройка ИИ-системы</p>

      <div className={c.field}>
        <p className={c.field_label}>
          Опишите контекст для ИИ-ассистента: кто вы, чем занимаетесь, какие цели преследуете в общении с контактами.
          ИИ будет использовать эту информацию при ответах в чате на страницах контактов.
        </p>
        <Textarea
          autoResize
          className={c.textarea}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Например: Я предприниматель в сфере IT. Моя цель — выстраивать долгосрочные партнёрские отношения. Помогай мне анализировать контакты и готовиться к встречам..."
        />
      </div>

      <Button
        variant="primary"
        className={c.save_btn}
        onClick={handleSave}
        disabled={saving}
      >
        {saved ? '✓ Сохранено' : saving ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </div>
  )
}

export { AiPromptSection }
