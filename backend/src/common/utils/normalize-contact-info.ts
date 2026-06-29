// Приведение значений подполей contact_info к каноничному виду: из username/номера
// строится полная ссылка (t.me/vk.com/instagram/wa.me), сайты/телефон/email остаются как есть.
// Вынесено из ai.service для изолированного юнит-тестирования.

export const CONTACT_INFO_DIFF_FIELDS = ['phone', 'email', 'telegram_profile', 'telegram_group', 'whatsapp', 'instagram', 'vk_profile', 'vk_group', 'personal_site', 'company_site'] as const
export type TContactInfoDiffField = typeof CONTACT_INFO_DIFF_FIELDS[number]

const LINK_PREFIXES: Partial<Record<TContactInfoDiffField, string>> = {
  telegram_profile: 'https://t.me/',
  telegram_group:   'https://t.me/',
  instagram:        'https://instagram.com/',
  vk_profile:       'https://vk.com/',
  vk_group:         'https://vk.com/',
}

const PLAIN_URL_FIELDS = new Set<TContactInfoDiffField>(['personal_site', 'company_site', 'phone', 'email', 'whatsapp'])

export const normalizeContactInfoValue = (field: TContactInfoDiffField, value: string): string => {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  if (field === 'whatsapp') {
    const digits = trimmed.replace(/[^\d+]/g, '')
    return digits ? `https://wa.me/${digits.replace(/^\+/, '')}` : trimmed
  }

  if (PLAIN_URL_FIELDS.has(field)) return trimmed

  const prefix = LINK_PREFIXES[field]
  return prefix ? `${prefix}${trimmed.replace(/^@/, '')}` : trimmed
}
