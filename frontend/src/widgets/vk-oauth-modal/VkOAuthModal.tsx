'use client'

import { Modal, modalCss, Button } from '@/shared/UI'
import { openVkOauthPopup } from '@/shared/utils'
import { STATIC_URL } from '@/shared/config/api.config'

import c from './VkOAuthModal.module.scss'

interface Props {
  active: boolean
  returnTo: string
  onClose: () => void
}

const VkOAuthModal = ({ active, returnTo, onClose }: Props) => {

  return (
    <Modal
      title="Подключить VK"
      onClose={onClose}
      active={active}
    >
      <div className={modalCss.body}>
        <div className={modalCss.field}>
          <label>Чтобы заполнять карточки контактов данными из VK, войдите через свой аккаунт VK.</label>
        </div>

        <p className={c.hint}>
          Доступ к вашему аккаунту VK используется исключительно, чтобы по вашему запросу
          заполнять карточки контактов данными из публичных профилей и групп. Токены доступа хранятся
          в зашифрованном виде; отключить интеграцию можно в любой момент в настройках.{' '}
          <a
            href={`${STATIC_URL}/privacy.html`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Политика конфиденциальности
          </a>
        </p>
      </div>

      <div className={modalCss.footer}>
        <Button variant="ghost" className={modalCss.cancel_btn} onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={() => openVkOauthPopup(returnTo)}>
          Войти через VK
        </Button>
      </div>
    </Modal>
  )
}

export { VkOAuthModal }
