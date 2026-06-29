import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUserStore } from '@/shared/store'
import { parseContactInfo, showAlert } from '@/shared/utils'
import { AiService } from '@/shared/api'
import { TelegramLoginModal, VkOAuthModal } from '@/widgets'
import type { TContact, TContactInfo, TContactScrapingLog } from '@/shared/types/contact.types'
import type { TEnrichFromSocialResponse, TAnalyzeActivityResponse } from '@/shared/types/api.types'
import { BasicFields, TelegramFields, VkFields, WebsiteFields } from './components'

import c from './ContactInfo.module.scss'


interface Props {
  contact: TContact
  set: <K extends keyof TContact>(field: K, value: TContact[K]) => void
  conflicts: TContactScrapingLog[]
  resolvingKeys: Set<string>
  onResolveConflict: (logId: string, field: string, choice: 'old' | 'new' | 'merge') => void
  onEnrichResult: (result: TEnrichFromSocialResponse) => void
  onActivityResult: (result: TAnalyzeActivityResponse) => void
  onScrapingChange: (isScraping: boolean) => void
  onSave: () => Promise<void>
}

type TPendingAction = 'scrape-telegram-profile' | 'enrich-telegram-group' | 'scrape-vk-profile' | 'analyze-profile' | 'analyze-group' | 'scrape-personal-site' | 'scrape-company-site'

const ContactInfo = ({ contact, set, conflicts, resolvingKeys, onResolveConflict, onEnrichResult, onActivityResult, onScrapingChange, onSave }: Props) => {

  const telegram_connected = useUserStore(s => s.telegram_connected)
  const vk_connected = useUserStore(s => s.vk_connected)
  const setVkConnected = useUserStore(s => s.setVkConnected)
  const disconnectVk = useUserStore(s => s.disconnectVk)

  const [enriching, setEnriching] = useState<'telegram_profile' | 'telegram_group' | 'vk' | 'personal_site' | 'company_site' | null>(null)
  const [enriched, setEnriched] = useState<{ telegram_profile: boolean; telegram_group: boolean; vk_profile: boolean; vk_group: boolean; personal_site: boolean; company_site: boolean }>({
    telegram_profile: false,
    telegram_group: false,
    vk_profile: false,
    vk_group: false,
    personal_site: false,
    company_site: false,
  })
  const [connectModal, setConnectModal] = useState<'telegram' | 'vk' | null>(null)
  const [analyzing, setAnalyzing] = useState<'profile' | 'group' | null>(null)

  const isScraping = enriching !== null || analyzing !== null

  useEffect(() => {
    onScrapingChange(isScraping)
  }, [isScraping])

  const router = useRouter()
  const searchParams = useSearchParams()

  const enrichedStorageKey = `enriched_${contact.id}`
  const pendingActionKey = `pendingAction_${contact.id}`

  useEffect(() => {
    const stored = localStorage.getItem(enrichedStorageKey)
    if (stored) setEnriched(JSON.parse(stored))
  }, [contact.id])

  const contactInfo = parseContactInfo(contact.contact_info)

  const setContactInfo = <K extends keyof TContactInfo>(field: K, value: TContactInfo[K]) =>
    set('contact_info', { ...contactInfo, [field]: value })

  const setPendingAction = (action: TPendingAction | null) => {
    if (action) localStorage.setItem(pendingActionKey, action)
    else localStorage.removeItem(pendingActionKey)
  }

  const runPendingAction = () => {
    const action = localStorage.getItem(pendingActionKey) as TPendingAction | null
    localStorage.removeItem(pendingActionKey)

    switch (action) {
      case 'scrape-telegram-profile': handleScrapeTelegramProfile(); break
      case 'enrich-telegram-group': handleEnrichTelegramGroup(); break
      case 'analyze-profile': handleAnalyzeActivity('profile'); break
      case 'analyze-group': handleAnalyzeActivity('group'); break
      case 'scrape-vk-profile':
      default: handleScrapeVkProfile()
    }
  }

  const handleScrapeTelegramProfile = async () => {
    if (!contactInfo.telegram_profile) return

    if (!useUserStore.getState().telegram_connected) {
      await onSave()
      setPendingAction('scrape-telegram-profile')
      setConnectModal('telegram')
      return
    }

    await onSave()

    setEnriching('telegram_profile')
    try {
      const { data } = await AiService.scrapeTelegramProfile(contact.id)
      onEnrichResult(data)
      setEnriched(prev => {
        const next = { ...prev, telegram_profile: true }
        localStorage.setItem(enrichedStorageKey, JSON.stringify(next))
        return next
      })
    } catch (err) {
      const message = (err as Error).message ?? 'Не удалось получить данные'

      if (message === 'NOT_CONNECTED') {
        await onSave()
        setPendingAction('scrape-telegram-profile')
        setConnectModal('telegram')
      } else {
        showAlert({
          text: [message],
          btnText: 'Закрыть',
        }, 5000)
      }
    } finally {
      setEnriching(null)
    }
  }

  const handleEnrichTelegramGroup = async () => {
    if (!contactInfo.telegram_group) return

    if (!useUserStore.getState().telegram_connected) {
      await onSave()
      setPendingAction('enrich-telegram-group')
      setConnectModal('telegram')
      return
    }

    await onSave()

    setEnriching('telegram_group')
    try {
      const { data } = await AiService.enrichTelegramGroup(contact.id)
      onEnrichResult(data)
      setEnriched(prev => {
        const next = { ...prev, telegram_group: true }
        localStorage.setItem(enrichedStorageKey, JSON.stringify(next))
        return next
      })
    } catch (err) {
      const message = (err as Error).message ?? 'Не удалось получить данные'

      if (message === 'NOT_CONNECTED') {
        await onSave()
        setPendingAction('enrich-telegram-group')
        setConnectModal('telegram')
      } else {
        showAlert({
          text: [message],
          btnText: 'Закрыть',
        }, 5000)
      }
    } finally {
      setEnriching(null)
    }
  }

  const handleAnalyzeActivity = async (source: 'profile' | 'group') => {
    if (!useUserStore.getState().vk_connected) {
      await onSave()
      setPendingAction(source === 'profile' ? 'analyze-profile' : 'analyze-group')
      setConnectModal('vk')
      return
    }

    await onSave()

    setAnalyzing(source)
    try {
      const { data } = await AiService.analyzeActivity(contact.id, source)
      onActivityResult(data)
      if (source === 'group') {
        setEnriched(prev => {
          const next = { ...prev, vk_group: true }
          localStorage.setItem(enrichedStorageKey, JSON.stringify(next))
          return next
        })
      }
    } catch (err) {
      const message = (err as Error).message ?? 'Не удалось проанализировать активность'

      if (message === 'NOT_CONNECTED') {
        await onSave()
        setPendingAction(source === 'profile' ? 'analyze-profile' : 'analyze-group')
        setConnectModal('vk')
      } else if (message === 'Невалидный VK-токен' || message.startsWith('VK-сессия истекла')) {
        void disconnectVk()
        await onSave()
        setPendingAction(source === 'profile' ? 'analyze-profile' : 'analyze-group')
        setConnectModal('vk')
      } else {
        showAlert({
          text: [message],
          btnText: 'Закрыть',
        }, 5000)
      }
    } finally {
      setAnalyzing(null)
    }
  }

  const handleScrapeVkProfile = async () => {
    if (!contactInfo.vk_profile) return

    if (!useUserStore.getState().vk_connected) {
      await onSave()
      setPendingAction('scrape-vk-profile')
      setConnectModal('vk')
      return
    }

    await onSave()

    setEnriching('vk')
    try {
      const { data } = await AiService.scrapeVkProfile(contact.id)
      onEnrichResult(data)
      setEnriched(prev => {
        const next = { ...prev, vk_profile: true }
        localStorage.setItem(enrichedStorageKey, JSON.stringify(next))
        return next
      })
    } catch (err) {
      const message = (err as Error).message ?? 'Не удалось получить данные'

      if (message === 'NOT_CONNECTED') {
        await onSave()
        setPendingAction('scrape-vk-profile')
        setConnectModal('vk')
      } else if (message === 'Невалидный VK-токен' || message.startsWith('VK-сессия истекла')) {
        void disconnectVk()
        await onSave()
        setPendingAction('scrape-vk-profile')
        setConnectModal('vk')
      } else {
        showAlert({
          text: [message],
          btnText: 'Закрыть',
        }, 5000)
      }
    } finally {
      setEnriching(null)
    }
  }

  const handleScrapeWebsite = async (field: 'personal_site' | 'company_site') => {
    await onSave()
    setEnriching(field)
    try {
      const { data } = await AiService.scrapeWebsite(contact.id, field)
      onEnrichResult(data)
      const firstLog = data.logs[0]
      if (firstLog?.type === 'no_changes') {
        showAlert({ text: [firstLog.message ?? 'Новых данных на сайте не обнаружено'], btnText: 'Закрыть' }, 5000)
      }
      setEnriched(prev => {
        const next = { ...prev, [field]: true }
        localStorage.setItem(enrichedStorageKey, JSON.stringify(next))
        return next
      })
    } catch (err) {
      console.error('[scrapeWebsite] error:', err)
      showAlert({
        text: [(err as Error).message ?? 'Не удалось получить данные с сайта'],
        btnText: 'Закрыть',
      }, 5000)
    } finally {
      setEnriching(null)
    }
  }

  useEffect(() => {
    const integration = searchParams.get('integration')
    const status = searchParams.get('status')
    if (integration !== 'vk' || !status) return

    // Это окно-попап OAuth — уведомляем основное окно и закрываемся,
    // скрапинг должен запуститься в основном окне (обработчик message/storage ниже)
    if (searchParams.get('popup') === '1') {
      localStorage.setItem('vk-oauth-result', JSON.stringify({ status, ts: Date.now() }))
      if (window.opener) window.opener.postMessage({ type: 'vk-oauth', status }, window.location.origin)
      setTimeout(() => window.close(), 150)
      return
    }

    router.replace(`/contacts/${contact.id}`)

    if (status === 'success') {
      runPendingAction()
    } else {
      showAlert({
        text: ['Не удалось подключить VK'],
        btnText: 'Закрыть',
      }, 5000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const handleVkOauthResult = (status: string) => {
      if (status === 'success') {
        setVkConnected()
        setConnectModal(null)
        runPendingAction()
      } else {
        showAlert({
          text: ['Не удалось подключить VK'],
          btnText: 'Закрыть',
        }, 5000)
      }
    }

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'vk-oauth') return

      handleVkOauthResult(e.data.status)
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== 'vk-oauth-result' || !e.newValue) return

      const { status } = JSON.parse(e.newValue)
      localStorage.removeItem('vk-oauth-result')
      handleVkOauthResult(status)
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={c.section}>
      <p className={c.section_title}>Контактные данные</p>

      <div className={c.fields_grid}>

        <BasicFields
          contactInfo={contactInfo}
          setContactInfo={setContactInfo}
        />

        <TelegramFields
          contactInfo={contactInfo}
          setContactInfo={setContactInfo}
          connected={telegram_connected}
          profileLoading={enriching === 'telegram_profile'}
          profileBusy={isScraping}
          groupLoading={enriching === 'telegram_group'}
          groupBusy={isScraping}
          enrichedProfile={enriched.telegram_profile}
          enrichedGroup={enriched.telegram_group}
          lastTgAnalysisAt={contact.last_tg_analysis_at}
          conflicts={conflicts}
          resolvingKeys={resolvingKeys}
          onResolveConflict={onResolveConflict}
          onScrapeProfile={handleScrapeTelegramProfile}
          onEnrichGroup={handleEnrichTelegramGroup}
        />

        <VkFields
          contactInfo={contactInfo}
          setContactInfo={setContactInfo}
          connected={vk_connected}
          profileLoading={enriching === 'vk'}
          profileBusy={isScraping}
          groupLoading={analyzing === 'group'}
          groupBusy={isScraping}
          profileEnriched={enriched.vk_profile}
          groupEnriched={enriched.vk_group}
          lastVkAnalysisAt={contact.last_vk_analysis_at}
          conflicts={conflicts}
          resolvingKeys={resolvingKeys}
          onResolveConflict={onResolveConflict}
          onScrapeProfile={handleScrapeVkProfile}
          onAnalyzeGroup={() => handleAnalyzeActivity('group')}
        />

        <WebsiteFields
          contactInfo={contactInfo}
          setContactInfo={setContactInfo}
          personalLoading={enriching === 'personal_site'}
          companyLoading={enriching === 'company_site'}
          busy={isScraping}
          enrichedPersonal={enriched.personal_site}
          enrichedCompany={enriched.company_site}
          conflicts={conflicts}
          resolvingKeys={resolvingKeys}
          onResolveConflict={onResolveConflict}
          onScrapePersonal={() => handleScrapeWebsite('personal_site')}
          onScrapeCompany={() => handleScrapeWebsite('company_site')}
        />

      </div>

      <TelegramLoginModal
        active={connectModal === 'telegram'}
        onClose={() => setConnectModal(null)}
        onConnected={() => {
          setConnectModal(null)
          runPendingAction()
        }}
      />

      <VkOAuthModal
        active={connectModal === 'vk'}
        returnTo={`/contacts/${contact.id}`}
        onClose={() => setConnectModal(null)}
      />
    </div>
  )
}

export { ContactInfo }
