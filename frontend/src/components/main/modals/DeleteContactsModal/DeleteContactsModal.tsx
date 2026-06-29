import { Button, Modal, modalCss as m } from '@/shared/UI'


interface Props {
  active: boolean
  count: number
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

const DeleteContactsModal = ({ active, count, deleting, onClose, onConfirm }: Props) => {

  return (
    <Modal
      active={active}
      title="Удалить контакты?"
      onClose={onClose}
      maxWidth={380}
    >
      <div className={m.body}>
        <p>Будет удалено контактов: {count}. Это действие нельзя отменить.</p>
      </div>
      <div className={m.footer}>
        <Button
          variant="ghost"
          className={m.cancel_btn}
          onClick={onClose}
        >
          Отмена
        </Button>
        <Button
          variant="danger"
          disabled={deleting}
          onClick={onConfirm}
        >
          {deleting ? 'Удаление...' : 'Удалить'}
        </Button>
      </div>
    </Modal>
  )
}

export { DeleteContactsModal }
