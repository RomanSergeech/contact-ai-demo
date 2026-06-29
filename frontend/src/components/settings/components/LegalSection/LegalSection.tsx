import { STATIC_URL } from '@/shared/config/api.config'

import c from './LegalSection.module.scss'


const LegalSection = () => {

  return (
    <div className={c.section}>
      <p className={c.section_title}>Правовая информация</p>

      <div className={c.links}>
        <a
          href={`${STATIC_URL}/terms.html`}
          target="_blank"
          rel="noopener noreferrer"
          className={c.link}
        >
          Пользовательское соглашение
        </a>

        <a
          href={`${STATIC_URL}/privacy.html`}
          target="_blank"
          rel="noopener noreferrer"
          className={c.link}
        >
          Политика конфиденциальности
        </a>
      </div>
    </div>
  )
}

export { LegalSection }
