import type { TContactInfo } from '@/shared/types/contact.types'

const EMPTY_CONTACT_INFO: TContactInfo = {
  phone: '',
  email: '',
  telegram_profile: '',
  telegram_group: '',
  whatsapp: '',
  instagram: '',
  vk_profile: '',
  vk_group: '',
  personal_site: '',
  company_site: '',
}

export const parseContactInfo = (raw: TContactInfo | null): TContactInfo => {
  if (!raw) return EMPTY_CONTACT_INFO

  return Object.keys(EMPTY_CONTACT_INFO).reduce(
    (acc, key) => ({ ...acc, [key]: raw[key as keyof TContactInfo] ?? '' }),
    {} as TContactInfo,
  )
}
