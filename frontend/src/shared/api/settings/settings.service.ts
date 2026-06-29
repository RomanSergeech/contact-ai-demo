import { $api } from '../../config/api.config'

import type {
  TSaveNameResponse,
  TSaveAiPromptResponse,
  TDisconnectVkResponse,
  TDisconnectTelegramResponse,
  TTelegramLoginStepResponse,
  TTelegramLoginCancelResponse,
  TTelegramQrStartResponse,
  TTelegramQrPollResponse,
  TDeleteAccountResponse,
} from '../../types/api.types'


class SettingsService {

  saveName(name: string) {
    return $api.post<TSaveNameResponse>('/user/settings/name', { name })
  }

  saveAiPrompt(ai_system_prompt: string) {
    return $api.post<TSaveAiPromptResponse>('/user/settings/save', { ai_system_prompt })
  }

  disconnectVk() {
    return $api.post<TDisconnectVkResponse>('/user/settings/vk/disconnect')
  }

  disconnectTelegram() {
    return $api.post<TDisconnectTelegramResponse>('/user/settings/telegram/disconnect')
  }

  telegramLoginStart(phone: string) {
    return $api.post<TTelegramLoginStepResponse>('/user/settings/telegram/start', { phone })
  }

  telegramLoginCode(code: string) {
    return $api.post<TTelegramLoginStepResponse>('/user/settings/telegram/code', { code })
  }

  telegramLoginPassword(password: string) {
    return $api.post<TTelegramLoginStepResponse>('/user/settings/telegram/password', { password })
  }

  telegramLoginCancel() {
    return $api.post<TTelegramLoginCancelResponse>('/user/settings/telegram/cancel')
  }

  telegramQrStart() {
    return $api.post<TTelegramQrStartResponse>('/user/settings/telegram/qr-start')
  }

  telegramQrPoll() {
    return $api.post<TTelegramQrPollResponse>('/user/settings/telegram/qr-poll')
  }

  deleteAccount() {
    return $api.delete<TDeleteAccountResponse>('/user/delete')
  }

}

export default new SettingsService()
