import type { TUser } from './user.types'
import type { TContact, TContactScrapingLog } from './contact.types'
import type { TTask } from './tasks.types'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type TLoginRequest = { login: string; password: string }
export type TLoginResponse = { user: TUser }
export type TCheckAuthResponse = { user: TUser }
export type TLogoutResponse = { ok: boolean }

// ─── Contacts ────────────────────────────────────────────────────────────────

export type TGetAllContactsResponse = TContact[]
export type TExportDataResponse = { contacts: TContact[]; tasks: TTask[] }
export type TGetContactResponse = TContact
export type TCreateContactResponse = TContact
export type TUpdateContactResponse = TContact
export type TDeleteContactResponse = { ok: boolean }
export type TDeleteContactsBulkResponse = { deleted: string[]; failed: string[] }
export type TUploadPhotoResponse = { photo: string | null }
export type TDeletePhotoResponse = { photo: string | null }
export type TGetContactLogsResponse = { logs: TContactScrapingLog[] }
export type TResolveContactLogResponse = { contact: TContact; log: TContactScrapingLog }

// ─── Tasks ───────────────────────────────────────────────────────────────────

export type TGetAllTasksResponse = TTask[]
export type TCreateTaskResponse = TTask
export type TUpdateTaskResponse = TTask
export type TDeleteTaskResponse = { ok: boolean }

// ─── Settings ────────────────────────────────────────────────────────────────

export type TSaveNameResponse = TUser
export type TSaveAiPromptResponse = TUser
export type TDisconnectVkResponse = TUser
export type TDisconnectTelegramResponse = TUser
export type TTelegramLoginStepResponse = { step: 'code' | 'password' | 'done' }
export type TTelegramLoginCancelResponse = { ok: boolean }
export type TTelegramQrStartResponse = { token: string; expires: number }
export type TTelegramQrPollResponse = { step: 'pending' | 'done' | 'password'; token?: string; expires?: number }
export type TDeleteAccountResponse = { ok: boolean }

// ─── Admin ───────────────────────────────────────────────────────────────────

export type TGetUsersResponse = TUser[]
export type TCreateUserResponse = TUser
export type TDeleteUserResponse = { ok: boolean }

// ─── AI ──────────────────────────────────────────────────────────────────────

export type TChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export type TGetHistoryResponse = { history: TChatMessage[] }
export type TSendMessageResponse = { text: string }

export type TTaskMetaData = { title: string; priority: string; deadline: string | null }
export type TGenerateTaskMetaResponse = TTaskMetaData

export type TVoiceContactData = Omit<TContact,
  'id' | 'user_id' | 'chat_history' | 'next_event_date' | 'created_at' |
  'priority' | 'relationship_level' | 'photo' | 'important_dates' | 'contact_info'
> & {
  priority: string
  relationship_level: string
  important_dates: { label: string; date: string }[]
  contact_details: {
    phone: string | null
    email: string | null
    telegram_profile: string | null
    telegram_group: string | null
    whatsapp: string | null
    instagram: string | null
    vk_profile: string | null
    vk_group: string | null
    personal_site: string | null
    company_site: string | null
  } | null
}
export type TParseContactFromVoiceResponse = TVoiceContactData

export type TClearHistoryResponse = { ok: boolean }

export type TEnrichFromSocialResponse = { contact: TContact; logs: TContactScrapingLog[] }

export type TAnalyzeActivityResponse = { contact: TContact; logs: TContactScrapingLog[] }

export type TScrapeVkProfileResponse = { contact: TContact; logs: TContactScrapingLog[] }

export type TScrapeTelegramProfileResponse = { contact: TContact; logs: TContactScrapingLog[] }

export type TEnrichTelegramGroupResponse = { contact: TContact; logs: TContactScrapingLog[] }

export type TScrapeWebsiteResponse = { contact: TContact; logs: TContactScrapingLog[] }
