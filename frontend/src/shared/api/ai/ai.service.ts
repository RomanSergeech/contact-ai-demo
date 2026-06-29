import { $api } from '../../config/api.config'

import type {
  TGetHistoryResponse,
  TSendMessageResponse,
  TGenerateTaskMetaResponse,
  TParseContactFromVoiceResponse,
  TClearHistoryResponse,
  TEnrichFromSocialResponse,
  TAnalyzeActivityResponse,
  TScrapeVkProfileResponse,
  TScrapeTelegramProfileResponse,
  TEnrichTelegramGroupResponse,
  TScrapeWebsiteResponse,
} from '../../types/api.types'


class AiService {

  getHistory(contactId: string) {
    return $api.get<TGetHistoryResponse>(`/ai/history/${contactId}`)
  }

  sendMessage(contactId: string, message: string) {
    return $api.post<TSendMessageResponse>(`/ai/${contactId}`, { message })
  }

  generateTaskMeta(description: string) {
    return $api.post<TGenerateTaskMetaResponse>('/ai/task-meta', { description })
  }

  parseContactFromVoice(text: string, signal?: AbortSignal) {
    return $api.post<TParseContactFromVoiceResponse>('/ai/contact-from-voice', { text }, { signal })
  }

  clearHistory(contactId: string) {
    return $api.post<TClearHistoryResponse>(`/ai/clear/${contactId}`)
  }

  enrichFromSocial(contactId: string, url: string, platform: 'telegram' | 'vk') {
    return $api.post<TEnrichFromSocialResponse>('/ai/enrich-from-social', { contactId, url, platform })
  }

  analyzeActivity(contactId: string, source: 'profile' | 'group') {
    return $api.post<TAnalyzeActivityResponse>('/ai/analyze-activity', { contactId, source })
  }

  scrapeVkProfile(contactId: string) {
    return $api.post<TScrapeVkProfileResponse>('/ai/scrape-vk-profile', { contactId })
  }

  scrapeTelegramProfile(contactId: string) {
    return $api.post<TScrapeTelegramProfileResponse>('/ai/scrape-telegram-profile', { contactId })
  }

  enrichTelegramGroup(contactId: string) {
    return $api.post<TEnrichTelegramGroupResponse>('/ai/enrich-telegram-group', { contactId })
  }

  scrapeWebsite(contactId: string, field: 'personal_site' | 'company_site') {
    return $api.post<TScrapeWebsiteResponse>('/ai/scrape-website', { contactId, field })
  }

}

export default new AiService()
