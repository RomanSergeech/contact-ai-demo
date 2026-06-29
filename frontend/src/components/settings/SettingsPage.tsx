import { cn } from '@/shared/utils'
import { ProfileSection, LegalSection, AiPromptSection, IntegrationsSection, ExportSection, DangerZoneSection } from './components'

import c from './page.module.scss'


const SettingsPage = () => {
  return (
    <div className={c.page}>
      <div className={cn(c.container, '_container')}>

        <h1 className='title'>
          Настройки
        </h1>

        <ProfileSection />

        <LegalSection />

        <AiPromptSection />

        <IntegrationsSection />

        <ExportSection />

        <DangerZoneSection />

      </div>
    </div>
  )
}

export { SettingsPage }
