'use client'

import { useState } from 'react'
import { Button } from '@/shared/UI'
import { showAlert } from '@/shared/utils'
import { ContactsService } from '@/shared/api'

import c from './ExportSection.module.scss'


const ExportSection = () => {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data } = await ContactsService.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contact-ai-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      showAlert({
        text: [(err as Error).message ?? 'Ошибка экспорта'],
        btnText: 'Закрыть',
      }, 5000)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={c.section}>
      <p className={c.section_title}>Мои данные</p>
      <p className={c.field_label}>
        Скачайте все ваши данные в формате JSON: контакты и задачи.
      </p>
      <Button
        variant="primary"
        className={c.save_btn}
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? 'Экспорт...' : 'Скачать данные'}
      </Button>
    </div>
  )
}

export { ExportSection }
