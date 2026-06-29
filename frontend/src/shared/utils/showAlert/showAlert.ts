import { useAlertStore } from '../../store'

type TShowAlertProps = {
  text: string[]
  btnText: string
}

export const showAlert = (props: TShowAlertProps, time?: number) => {
  useAlertStore.getState().show(props)
  if (time) {
    setTimeout(() => useAlertStore.getState().hide(), time)
  }
}
