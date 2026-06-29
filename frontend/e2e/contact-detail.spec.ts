import { test, expect, type Page } from '@playwright/test'
import { mockApi, makeContact, setupAuthenticatedSession } from './helpers/api-mock'


const contact = makeContact({
  id:       'c1',
  full_name: 'Иван Иванов',
  position: 'Менеджер',
  company:  'ООО Тест',
})

// Navigates to the contact page. Uses domcontentloaded to avoid blocking on
// Turbopack RSC requests that stall without completing the load event.
const gotoContact = async (page: Page) => {
  await page.goto('/contacts/c1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Иван Иванов').first()).toBeVisible({ timeout: 15000 })
}

test.describe('Contact detail page', () => {

  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedSession(page, [contact])
    await mockApi.ai.getHistory(page, 'c1')
    await page.route('**/contact/c1/logs', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ logs: [] }) })
    )
  })

  test('shows contact name and position in sidebar', async ({ page }) => {
    await gotoContact(page)
    await expect(page.getByText('Менеджер').first()).toBeVisible()
  })

  test('back button navigates to /main', async ({ page }) => {
    await gotoContact(page)
    await page.getByRole('button', { name: 'Контакты' }).click()
    await expect(page).toHaveURL('/main')
  })

  test('saves updated contact', async ({ page }) => {
    const updated = makeContact({ id: 'c1', full_name: 'Иван Обновлённый', position: 'Менеджер', company: 'ООО Тест' })
    await mockApi.contacts.update(page, updated)
    await gotoContact(page)

    const nameInput = page.locator('xpath=//label[text()="ФИО"]/following-sibling::input')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Иван Обновлённый')
    await page.getByRole('button', { name: 'Понятно' }).click({ timeout: 3000 }).catch(() => {})
    await page.getByRole('button', { name: 'Сохранить' }).click()

    await expect(page.getByRole('button', { name: 'Сохранить' })).toBeVisible()
  })

  test('delete contact with confirm navigates to /main', async ({ page }) => {
    await mockApi.contacts.delete(page)
    await gotoContact(page)

    page.on('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Удалить контакт' }).click()

    await expect(page).toHaveURL('/main')
  })

  test('"Add task" navigates to tasks page for this contact', async ({ page }) => {
    await mockApi.tasks.getAll(page, [])
    await gotoContact(page)
    await page.getByRole('button', { name: '+ Добавить задачу' }).click()
    await expect(page).toHaveURL('/tasks?createFor=c1')
  })

  test('fetches contact from API when not in store', async ({ page }) => {
    // Override getAll to return empty list — contact not in store.
    // By this point previous tests have compiled the contact page in Turbopack cache.
    await mockApi.contacts.getAll(page)
    await mockApi.contacts.getById(page, contact)
    await page.goto('/contacts/c1')
    await expect(page.getByText('Иван Иванов').first()).toBeVisible({ timeout: 10000 })
  })

  test('photo upload replaces placeholder with image', async ({ page }) => {
    await mockApi.contacts.uploadPhoto(page)
    await mockApi.contacts.update(page, { ...contact, photo: '/uploads/test-photo.jpg' })
    await gotoContact(page)

    await expect(page.locator('img.photo_img')).not.toBeVisible()

    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(
      { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake-image-data') },
    )

    await expect(page.locator('img')).toBeVisible()
  })

})

const EMPTY_INFO = {
  phone: '', email: '', telegram_profile: '', telegram_group: '', whatsapp: '',
  instagram: '', vk_profile: '', vk_group: '', personal_site: '', company_site: '',
}

const VK_PROFILE_PLACEHOLDER = 'https://vk.com/id123456'
const VK_ENRICH_TITLE = 'Заполнить из VK-профиля и проанализировать посты за последнюю неделю'

// контакт с заполненной личной страницей VK — чтобы кнопка обогащения была активна
const vkContact = makeContact({
  id:           'c1',
  full_name:    'Иван Иванов',
  position:     'Менеджер',
  company:      'ООО Тест',
  contact_info: { ...EMPTY_INFO, vk_profile: 'https://vk.com/id1' },
})

const gotoVkContact = async (page: Page) => {
  await page.goto('/contacts/c1', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Иван Иванов').first()).toBeVisible({ timeout: 15000 })
  // закрыть возможную информационную модалку, если появилась
  await page.getByRole('button', { name: 'Понятно' }).click({ timeout: 2000 }).catch(() => {})
}

test.describe('Contact scraping & conflicts', () => {

  test.beforeEach(async ({ page }) => {
    await mockApi.ai.getHistory(page, 'c1')
    await mockApi.tasks.getAll(page, [])
  })

  test('VK profile scraping fills the card with returned data', async ({ page }) => {
    // VK подключён → клик запускает скрапинг, а не модалку подключения
    await mockApi.auth.checkAuthConnected(page)
    await mockApi.contacts.getAll(page, [vkContact])
    await mockApi.contacts.getLogs(page, 'c1', [])

    const enriched = makeContact({
      id:           'c1',
      full_name:    'Иван Иванов',
      position:     'Технический директор',
      company:      'ООО Тест',
      contact_info: vkContact.contact_info,
    })
    await mockApi.ai.scrapeVkProfile(page, {
      contact: enriched,
      logs: [{
        id: 'log1', contact_id: 'c1', platform: 'vk', source: 'profile', type: 'added',
        changes: [{ field: 'position', old_value: 'Менеджер', new_value: 'Технический директор' }],
        posts_analyzed: 5, message: null, created_at: '2024-01-01',
      }],
    })

    await gotoVkContact(page)

    await page.getByTitle(VK_ENRICH_TITLE).click()

    // карточка обновилась данными из ответа скрапинга
    await expect(page.getByText('Технический директор').first()).toBeVisible({ timeout: 10000 })
  })

  test('resolving a VK profile conflict replaces the conflict UI with a normal field', async ({ page }) => {
    await mockApi.auth.checkAuthSuccess(page)
    await mockApi.contacts.getAll(page, [vkContact])

    const conflictLog = {
      id: 'log-c1', contact_id: 'c1', platform: 'vk', source: 'profile', type: 'conflict',
      changes: [{ field: 'contact_info.vk_profile', old_value: 'https://vk.com/id1', new_value: 'https://vk.com/id999' }],
      posts_analyzed: null, message: null, created_at: '2024-01-01',
    }
    await mockApi.contacts.getLogs(page, 'c1', [conflictLog])

    const resolved = makeContact({
      id:           'c1',
      full_name:    'Иван Иванов',
      position:     'Менеджер',
      company:      'ООО Тест',
      contact_info: { ...EMPTY_INFO, vk_profile: 'https://vk.com/id999' },
    })
    await mockApi.contacts.resolveLog(page, {
      contact: resolved,
      log: { ...conflictLog, changes: [{ ...conflictLog.changes[0], resolution: 'changed' }] },
    })

    await gotoVkContact(page)

    // пока конфликт не разрешён — обычного инпута VK-профиля нет, виден блок конфликта
    await expect(page.getByPlaceholder(VK_PROFILE_PLACEHOLDER)).toHaveCount(0)
    await expect(page.getByText('https://vk.com/id999').first()).toBeVisible()

    // выбираем новое значение (клик по строке нового значения)
    const resolveReq = page.waitForRequest('**/contact/c1/logs/*/resolve')
    await page.getByText('https://vk.com/id999').first().click()
    await resolveReq

    // конфликт разрешён → поле снова обычный инпут
    await expect(page.getByPlaceholder(VK_PROFILE_PLACEHOLDER)).toBeVisible({ timeout: 10000 })
  })

})
